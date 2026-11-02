/** Katalog memakai allowlist model, field, tipe dan ukuran, bukan nama tabel dari input. */
const prisma = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

const JENIS = Object.freeze({
  surat: { model: 'jenisSurat', label: 'Jenis Surat', resource: 'jenis_surat' },
  arsip: { model: 'jenisArsip', label: 'Jenis Arsip', resource: 'jenis_arsip' },
});
const FIELD = new Set(['kode', 'nama', 'keterangan', 'aktif']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function pastikanJenis(jenis) {
  if (typeof jenis !== 'string' || !Object.hasOwn(JENIS, jenis)) {
    throw new AppError(400, 'Jenis katalog tidak dikenal. Pilih surat atau arsip.');
  }
  return JENIS[jenis];
}

function normalkanKode(input) {
  return typeof input === 'string' ? input.trim().toLowerCase().replace(/[\s_]+/g, '-') : '';
}

function validasi(data, wajib) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new AppError(400, 'Isian harus berupa objek JSON.');
  }
  if (Object.keys(data).some((k) => !FIELD.has(k))) {
    throw new AppError(400, 'Isian berisi field yang tidak dikenal.');
  }
  const hasil = {};
  if (Object.hasOwn(data, 'nama') || wajib) {
    if (typeof data.nama !== 'string' || !data.nama.trim() || data.nama.trim().length > 120) {
      throw new AppError(400, 'Nama wajib berupa teks, maksimal 120 karakter.');
    }
    hasil.nama = data.nama.trim();
  }
  if (Object.hasOwn(data, 'kode') || wajib) {
    const mentah = Object.hasOwn(data, 'kode') ? data.kode : data.nama;
    const kode = normalkanKode(mentah);
    if (!kode || kode.length > 40 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(kode)) {
      throw new AppError(400, 'Kode wajib huruf, angka atau tanda hubung, maksimal 40 karakter.');
    }
    hasil.kode = kode;
  }
  if (Object.hasOwn(data, 'keterangan')) {
    if (data.keterangan !== null && typeof data.keterangan !== 'string') {
      throw new AppError(400, 'Keterangan harus berupa teks.');
    }
    if ((data.keterangan || '').trim().length > 500) {
      throw new AppError(400, 'Keterangan maksimal 500 karakter.');
    }
    hasil.keterangan = (data.keterangan || '').trim() || null;
  }
  if (Object.hasOwn(data, 'aktif')) {
    if (typeof data.aktif !== 'boolean') throw new AppError(400, 'Aktif harus true atau false.');
    hasil.aktif = data.aktif;
  }
  if (!Object.keys(hasil).length) throw new AppError(400, 'Tidak ada perubahan yang dikirim.');
  return hasil;
}

async function daftar(jenis, { aktifSaja = false } = {}) {
  return prisma[pastikanJenis(jenis).model].findMany({
    where: aktifSaja ? { aktif: true } : {},
    orderBy: [{ aktif: 'desc' }, { kode: 'asc' }],
  });
}

async function buat(jenis, data) {
  const def = pastikanJenis(jenis);
  const isian = validasi(data, true);
  try {
    return await prisma[def.model].create({ data: isian });
  } catch (e) {
    if (e.code === 'P2002') throw new AppError(409, `${def.label} dengan kode tersebut sudah ada.`);
    throw e;
  }
}

async function ubah(jenis, id, data) {
  const def = pastikanJenis(jenis);
  if (typeof id !== 'string' || !UUID.test(id)) throw new AppError(400, 'ID tidak valid.');
  const isian = validasi(data, false);
  try {
    return await prisma[def.model].update({ where: { id }, data: isian });
  } catch (e) {
    if (e.code === 'P2025') throw new AppError(404, `${def.label} tidak ditemukan.`);
    if (e.code === 'P2002') throw new AppError(409, `${def.label} dengan kode tersebut sudah ada.`);
    throw e;
  }
}

module.exports = { JENIS, daftar, buat, ubah, pastikanJenis, normalkanKode };
