/**
 * Validasi env sejak boot. Kalau ada yang kurang, server MATI di sini --
 * bukan nanti di request pertama. Alasan: variabel yang hilang di dev
 * sering muncul sebagai bug acak di produksi; lebih baik gagal keras.
 */
require('dotenv').config();

const WAJIB = ['JWT_SECRET', 'DATABASE_URL', 'PORT', 'MODE'];
const kurang = WAJIB.filter((k) => !process.env[k] || process.env[k].trim() === '');

if (kurang.length > 0) {
  console.error('[env] Variabel wajib belum terisi:', kurang.join(', '));
  console.error('[env] Salin .env.contoh menjadi .env dan isi minimal keempat variabel di atas.');
  process.exit(1);
}

if (process.env.JWT_SECRET === 'ganti-ini-sebelum-run-pertama') {
  console.error('[env] JWT_SECRET masih nilai contoh. Generate dengan:');
  console.error('      node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  process.exit(1);
}

if (process.env.JWT_SECRET.length < 32) {
  console.error('[env] JWT_SECRET terlalu pendek (minimal 32 karakter).');
  process.exit(1);
}

const MODE = process.env.MODE;
if (!['lab', 'produksi'].includes(MODE)) {
  console.error(`[env] MODE harus "lab" atau "produksi", bukan "${MODE}".`);
  process.exit(1);
}

const env = {
  MODE,
  PRODUKSI: MODE === 'produksi',
  LAB: MODE === 'lab',
  PORT: parseInt(process.env.PORT, 10),
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '12h',
  CORS_ORIGIN: [...new Set([
    ...(process.env.CORS_ORIGIN || '').split(',').map((o) => o.trim()).filter(Boolean),
    ...(MODE === 'lab' ? ['http://localhost:5173', 'http://127.0.0.1:5173'] : []),
  ])],
  STORAGE_DIR: process.env.STORAGE_DIR || './storage',
  LOGIN_RATE_LIMIT_WINDOW_MS: parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS, 10) || 900000,
  LOGIN_RATE_LIMIT_MAX: parseInt(process.env.LOGIN_RATE_LIMIT_MAX, 10) || 5,
};

module.exports = env;
