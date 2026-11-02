/**
 * Middleware route: requirePermission(resource, aksi).
 *
 * Dipakai:
 *   router.get('/', requirePermission('surat_masuk', 'read'), handler)
 *
 * Validasi (resource, aksi) terjadi SAAT middleware DIBUAT (boot time),
 * bukan per request. Typo akan membuat server crash saat start -- itu
 * disengaja, lebih baik gagal keras dari pada bocor diam-diam.
 *
 * Pesan 403 menyebut aksi + resource + siapa yang bisa mengaktifkan.
 * "Akses ditolak" saja tidak membantu user tahu harus meminta ke siapa.
 */
const prisma = require('../config/database');
const { AppError } = require('./errorHandler');
const {
  bolehkah, AKSI_DIDUKUNG, RESOURCE,
  LABEL_RESOURCE, LABEL_AKSI,
} = require('../services/izin.service');

function requirePermission(resource, aksi) {
  if (!RESOURCE.includes(resource)) {
    throw new Error(`requirePermission: resource "${resource}" tidak terdaftar.`);
  }
  if (!AKSI_DIDUKUNG[resource].includes(aksi)) {
    throw new Error(`requirePermission: aksi "${aksi}" tidak didukung untuk resource "${resource}".`);
  }

  return async function (req, res, next) {
    try {
      if (!req.user) throw new AppError(401, 'Anda belum login.');

      const boleh = await bolehkah(prisma, req.user, resource, aksi);
      if (boleh) return next();

      throw new AppError(
        403,
        `Anda tidak memiliki izin ${LABEL_AKSI[aksi]} data ${LABEL_RESOURCE[resource]}. ` +
          'Minta Superadmin mengaktifkannya lewat Manajemen User.'
      );
    } catch (err) {
      next(err);
    }
  };
}

module.exports = requirePermission;
