/**
 * AppError + errorHandler + notFoundHandler.
 *
 * Semua jalur error dilempar sebagai `AppError(status, pesan)` oleh code
 * aplikasi. `errorHandler` di app.js menyatukan output menjadi JSON
 * yang bentuknya konsisten:
 *
 *   { success: false, message: "pesan ramah untuk user" }
 *
 * Error 500 TIDAK membocorkan stack ke client. Stack ditulis ke stderr
 * supaya tetap bisa didebug lewat log.
 */

class AppError extends Error {
  constructor(status, pesan) {
    super(pesan);
    this.status = status;
    this.name = 'AppError';
  }
}

function errorHandler(err, req, res, next) {
  // eslint-disable-line no-unused-vars
  if (err instanceof AppError) {
    return res.status(err.status).json({ success: false, message: err.message });
  }

  // Body-parser (express.json): JSON rusak, body terlalu besar, atau
  // "null" saat strict. Kesalahan klien, bukan server.
  if (err && err.type && typeof err.status === 'number' && err.status >= 400 && err.status < 500) {
    const pesan = err.type === 'entity.too.large'
      ? 'Isian terlalu besar.'
      : 'Isian tidak valid. Kirim JSON berupa objek.';
    return res.status(err.status).json({ success: false, message: pesan });
  }

  // Prisma: hanya error yang benar-benar user-caused dilempar sebagai 400.
  // Yang lain (koneksi putus, record tidak ditemukan di jalur yang
  // seharusnya ada, dsb.) jatuh ke 500 supaya monitoring bisa alert.
  //
  // Daftar user-caused yang dikenali:
  //   P2000  value too long for the column type
  //   P2001  record not found (where WHERE clause menemukan 0)   -- 404
  //   P2002  unique constraint violation                         -- 409
  //   P2003  foreign key constraint failed                       -- 400
  //   P2004  failed constraint (umum)                            -- 400
  //   P2011  null constraint violation                           -- 400
  //   P2012  missing required value                              -- 400
  //   P2014  violated required relation                          -- 400
  //   P2025  record to update/delete not found                   -- 404
  // Lain-lain (termasuk P1xxx connection errors, P5xxx query engine) -> 500.
  if (err && typeof err.code === 'string' && err.code.startsWith('P')) {
    const kode = err.code;
    const map404 = ['P2001', 'P2025'];
    const map409 = ['P2002'];
    const map400 = ['P2000', 'P2003', 'P2004', 'P2011', 'P2012', 'P2014'];
    if (map404.includes(kode)) {
      return res.status(404).json({ success: false, message: 'Data tidak ditemukan.' });
    }
    if (map409.includes(kode)) {
      return res.status(409).json({
        success: false,
        message: 'Data yang Anda kirim bentrok dengan data yang sudah ada.',
      });
    }
    if (map400.includes(kode)) {
      return res.status(400).json({
        success: false,
        message: 'Permintaan tidak valid: data tidak memenuhi batasan tabel.',
      });
    }
    // Prisma error lain = masalah server. Jatuh ke 500 di bawah.
    console.error('[prisma-500]', kode, err.message);
  }

  console.error('[500]', err && err.stack ? err.stack : err);
  return res.status(500).json({
    success: false,
    message: 'Terjadi kesalahan di server. Coba lagi beberapa saat atau hubungi admin.',
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `Rute ${req.method} ${req.originalUrl} tidak ada.`,
  });
}

module.exports = { AppError, errorHandler, notFoundHandler };
