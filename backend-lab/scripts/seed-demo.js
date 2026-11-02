/**
 * Seed data demo untuk Memoria Lab. ULANG-PAKAI AMAN: wipe lalu re-seed.
 *
 * JANGAN pernah dijalankan di produksi -- hapus semua data!
 *
 * Pemakaian:
 *   npm run seed
 */
const prisma = require('../src/config/database');
const bcrypt = require('bcryptjs');

async function main() {
  if (process.env.MODE !== 'lab') {
    console.error('[seed] MODE bukan "lab". Dibatalkan untuk keamanan.');
    process.exit(1);
  }

  console.log('[seed] menghapus data lama ...');
  // Urutan hapus mengikuti dependensi (anak dulu).
  await prisma.idempotencyKey.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.lampiran.deleteMany();
  await prisma.tindakLanjut.deleteMany();
  await prisma.disposisi.deleteMany();
  await prisma.suratMasuk.deleteMany();
  await prisma.suratKeluar.deleteMany();
  await prisma.agenda.deleteMany();
  await prisma.userPermission.deleteMany();
  await prisma.user.deleteMany();
  await prisma.klasifikasi.deleteMany();
  await prisma.bagian.deleteMany();

  console.log('[seed] membuat Bagian ...');
  const bagian = await Promise.all([
    prisma.bagian.create({ data: { nama: 'Kurikulum',  singkatan: 'KUR' } }),
    prisma.bagian.create({ data: { nama: 'Kesiswaan',  singkatan: 'KSW' } }),
    prisma.bagian.create({ data: { nama: 'Sarana & Prasarana', singkatan: 'SRP' } }),
    prisma.bagian.create({ data: { nama: 'Humas',      singkatan: 'HMS' } }),
    prisma.bagian.create({ data: { nama: 'Tata Usaha', singkatan: 'TUB' } }),
  ]);

  console.log('[seed] membuat Klasifikasi ...');
  // Subset sederhana (bukan SKKA penuh). Klien bisa menambah via UI.
  await Promise.all([
    prisma.klasifikasi.create({ data: { kode: 'UM', nama: 'Umum',           urutan: 1, retensi_tahun: 5  } }),
    prisma.klasifikasi.create({ data: { kode: 'KS', nama: 'Kesiswaan',      urutan: 2, retensi_tahun: 10 } }),
    prisma.klasifikasi.create({ data: { kode: 'KR', nama: 'Kurikulum',      urutan: 3, retensi_tahun: 10 } }),
    prisma.klasifikasi.create({ data: { kode: 'KP', nama: 'Kepegawaian',    urutan: 4, retensi_tahun: 25 } }),
    prisma.klasifikasi.create({ data: { kode: 'KU', nama: 'Keuangan',       urutan: 5, retensi_tahun: 10 } }),
    prisma.klasifikasi.create({ data: { kode: 'SP', nama: 'Sarana Prasarana', urutan: 6, retensi_tahun: 10 } }),
    prisma.klasifikasi.create({ data: { kode: 'HM', nama: 'Humas',          urutan: 7, retensi_tahun: 5  } }),
  ]);

  console.log('[seed] membuat User demo ...');
  const hash = await bcrypt.hash('demo1234', 12);
  await Promise.all([
    prisma.user.create({ data: {
      email: 'superadmin@memoria.lab', nama_lengkap: 'Super Admin',
      password_hash: hash, peran: 'superadmin', bisa_hapus: true,
    } }),
    prisma.user.create({ data: {
      email: 'tu@memoria.lab', nama_lengkap: 'Dewi Tata Usaha',
      password_hash: hash, peran: 'tata_usaha',
    } }),
    prisma.user.create({ data: {
      email: 'kepsek@memoria.lab', nama_lengkap: 'Bapak Kepala Sekolah',
      password_hash: hash, peran: 'kepala_sekolah',
    } }),
    prisma.user.create({ data: {
      email: 'kurikulum@memoria.lab', nama_lengkap: 'Waka Kurikulum',
      password_hash: hash, peran: 'kepala_bagian', bagian_id: bagian[0].id,
    } }),
    prisma.user.create({ data: {
      email: 'kesiswaan@memoria.lab', nama_lengkap: 'Waka Kesiswaan',
      password_hash: hash, peran: 'kepala_bagian', bagian_id: bagian[1].id,
    } }),
    prisma.user.create({ data: {
      email: 'guru@memoria.lab', nama_lengkap: 'Pak Guru Contoh',
      password_hash: hash, peran: 'guru_staf',
    } }),
  ]);

  console.log('[seed] selesai.');
  console.log('[seed] Login dengan email di atas, password: demo1234');
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('[seed] GAGAL:', e);
  await prisma.$disconnect();
  process.exit(1);
});
