/**
 * Setup Express global. Entry listen() ada di ../server.js.
 */
const express = require('express');
const cors = require('cors');

const env = require('./config/env');
const { AppError, errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const katalogRoutes = require('./routes/katalog.routes');
const alurRoutes = require('./routes/alur.routes');
const { penggunaRoutes, aktivitasRoutes } = require('./routes/pengguna.routes');

const app = express();

// Produksi mungkin di belakang proxy (Render). Lab tidak, tapi set konsisten.
app.set('trust proxy', env.PRODUKSI ? 1 : 0);

// Header keamanan dasar -- berlaku di lab dan produksi.
// CSP ditambahkan hanya di produksi (longgar di lab supaya HMR Vite jalan).
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (env.PRODUKSI) {
    res.setHeader('Strict-Transport-Security', 'max-age=15552000');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
    );
  }
  next();
});

app.use(cors({
  origin: (origin, cb) => {
    // Request same-origin atau tool CLI (curl, uji-*.js) tanpa Origin -> izinkan.
    if (!origin) return cb(null, true);
    if (env.CORS_ORIGIN.includes(origin)) return cb(null, true);
    return cb(new AppError(403, 'Origin permintaan tidak diizinkan.'));
  },
  credentials: false, // JWT di Authorization header, bukan cookie.
}));

app.use(express.json({ limit: '2mb' }));

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/katalog', katalogRoutes);
app.use('/api/pengguna', penggunaRoutes);
app.use('/api/aktivitas', aktivitasRoutes);
app.use('/api', alurRoutes);

// 404 dan error handler terakhir
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
