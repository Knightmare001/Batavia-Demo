/**
 * Seed katalog idempoten: upsert kode normal, tidak menimpa field nama/
 * keterangan/aktif kalau sudah ada. Boleh dipanggil berkali-kali.
 */
const CONTOH_JENIS_SURAT = Object.freeze([
  { kode: 'izin',          nama: 'Surat Izin' },
  { kode: 'dispensasi',    nama: 'Surat Dispensasi' },
  { kode: 'perintah',      nama: 'Surat Perintah' },
  { kode: 'pernyataan',    nama: 'Surat Pernyataan' },
  { kode: 'imbauan',       nama: 'Surat Imbauan' },
]);

const CONTOH_JENIS_ARSIP = Object.freeze([
  { kode: 'sk',       nama: 'Surat Keputusan' },
  { kode: 'mou',      nama: 'Memorandum / MoU' },
  { kode: 'laporan',  nama: 'Laporan' },
  { kode: 'agenda',   nama: 'Agenda' },
  { kode: 'notulen',  nama: 'Notulen Rapat' },
]);

async function upsertSemua(model, daftar) {
  for (const item of daftar) {
    await model.upsert({
      where:  { kode: item.kode },
      update: {},                                 // sentuh updated_at saja
      create: { kode: item.kode, nama: item.nama },
    });
  }
}

async function seedKatalog(prisma) {
  await upsertSemua(prisma.jenisSurat, CONTOH_JENIS_SURAT);
  await upsertSemua(prisma.jenisArsip, CONTOH_JENIS_ARSIP);
}

module.exports = { seedKatalog, CONTOH_JENIS_SURAT, CONTOH_JENIS_ARSIP };

if (require.main === module) {
  require('dotenv').config({ path: require('node:path').join(__dirname, '..', '.env') });
  if (process.env.MODE !== 'lab') {
    console.error('[seed-katalog] MODE bukan "lab". Dibatalkan untuk keamanan.');
    process.exit(1);
  }
  const prisma = require('../src/config/database');
  seedKatalog(prisma)
    .then(async () => {
      const [a, b] = await Promise.all([prisma.jenisSurat.count(), prisma.jenisArsip.count()]);
      console.log(`[seed-katalog] jenis_surat=${a}, jenis_arsip=${b}`);
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error('[seed-katalog] GAGAL:', e.message);
      await prisma.$disconnect();
      process.exit(1);
    });
}
