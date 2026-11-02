/**
 * Auth: login + izin-saya.
 *
 * Login:
 *   POST /api/auth/login { email, password }
 *   -> 200 { success, data: { token, user: { id, nama, peran, bagian_id } } }
 *   -> 401 (pesan generik) kalau gagal
 *
 *   Rate limit: 5 gagal / 15 menit per kombinasi (IP + email lowercased).
 *   Alasan: per-IP saja gampang di-bypass dari banyak IP, dan di belakang
 *   proxy produksi IP bisa menyatu jadi edge Render -> satu limiter untuk
 *   semua user. Per-email saja gampang di-DoS orang lain (lock akun kita).
 *   Kombinasi: menargetkan brute force terhadap akun spesifik dari IP
 *   mana pun, DAN brute force horizontal dari IP yang sama.
 *
 *   Setiap login_sukses dan login_gagal dicatat di activity_logs (lewat
 *   logAudit). Login gagal termasuk email yang dicoba (untuk forensik),
 *   TAPI response ke client tetap generik supaya tidak membocorkan
 *   enumerasi akun.
 *
 * Izin-saya:
 *   GET /api/auth/izin-saya
 *   -> 200 { success, data: { peran, bisa_hapus, izin: {<matriks lengkap>} } }
 *   Polled oleh client tiap 60 detik + visibilitychange + focus.
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

const prisma = require('../config/database');
const env = require('../config/env');
const authenticate = require('../middleware/authenticate');
const { AppError } = require('../middleware/errorHandler');
const { logAudit } = require('../middleware/logActivity');
const { izinEfektif } = require('../services/izin.service');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: env.LOGIN_RATE_LIMIT_WINDOW_MS,
  max: env.LOGIN_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  // Versi 8 menerima string IP, bukan objek request.
  keyGenerator: (req) => {
    const email = typeof req.body?.email === 'string'
      ? req.body.email.trim().toLowerCase() : '';
    return `${ipKeyGenerator(req.ip)}::${email}`;
  },
  message: { success: false, message: 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.' },
});

// Pesan sengaja identik untuk "akun tidak ada" vs "password salah".
// Jangan ubah -- membocorkan eksistensi akun = kemudahan brute force.
const PESAN_GAGAL = 'Email atau password salah.';

router.post(
  '/login',
  loginLimiter,
  // JANGAN pakai normalizeEmail: ia merampas titik Gmail, membuang +tag,
  // dan dapat memisahkan antara apa yang tersimpan di DB saat register
  // dengan apa yang dilookup saat login. Yang cukup: trim + lowercase.
  body('email').isEmail().withMessage('Email tidak valid.'),
  body('password').isString().isLength({ min: 1 }).withMessage('Password wajib.'),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError(400, errors.array().map((e) => e.msg).join(' '));
      }

      const emailAsli = String(req.body.email).trim();
      const email = emailAsli.toLowerCase();
      const { password } = req.body;

      const user = await prisma.user.findUnique({ where: { email } });

      // Login gagal -> catat (email yang dicoba + IP), tetap balas generik.
      if (!user || user.deleted_at || !user.aktif) {
        await logAudit({
          user: null,
          aksi: 'login_gagal',
          entitas: 'user',
          emailJikaGagalLogin: emailAsli,
          req,
        });
        throw new AppError(401, PESAN_GAGAL);
      }

      const cocok = await bcrypt.compare(password, user.password_hash);
      if (!cocok) {
        await logAudit({
          user: null,
          aksi: 'login_gagal',
          entitas: 'user',
          entitasId: user.id,
          detail: `Password salah untuk akun "${user.email}".`,
          req,
        });
        throw new AppError(401, PESAN_GAGAL);
      }

      const token = jwt.sign(
        { sub: user.id, peran: user.peran },
        env.JWT_SECRET,
        { expiresIn: env.JWT_EXPIRES_IN }
      );

      await logAudit({
        user: { id: user.id, nama: user.nama_lengkap },
        aksi: 'login_sukses',
        entitas: 'user',
        entitasId: user.id,
        detail: `Login berhasil (${user.email}).`,
        req,
      });

      res.json({
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            nama: user.nama_lengkap,
            peran: user.peran,
            bagian_id: user.bagian_id,
            bisa_hapus: user.bisa_hapus,
          },
        },
      });
    } catch (e) {
      next(e);
    }
  }
);

router.get('/izin-saya', authenticate, async (req, res, next) => {
  try {
    const matriks = await izinEfektif(prisma, req.user);
    res.json({
      success: true,
      data: {
        user: req.user,
        peran: req.user.peran,
        bisa_hapus: req.user.bisa_hapus,
        izin: matriks,
      },
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
