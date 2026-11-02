/** Fixture sintetis idempoten. Tidak mengubah akun atau surat yang sudah ada. */
const bcrypt = require('bcryptjs');
async function seedAlur(prisma, options = {}) {
  const password = options.password || process.env.DEMO_PASSWORD;
  if (typeof password !== 'string' || password.length < 12) throw new Error('DEMO_PASSWORD minimal 12 karakter wajib disediakan, tidak ada password bawaan.');
  const hash = await bcrypt.hash(password, 12);
  const unit = await prisma.bagian.upsert({ where: { singkatan: 'DEMO-TU' }, update: {}, create: { nama: '[SINTETIS] Tata Usaha Demo', singkatan: 'DEMO-TU' } });
  const unit2 = await prisma.bagian.upsert({ where: { singkatan: 'DEMO-KUR' }, update: {}, create: { nama: '[SINTETIS] Kurikulum Demo', singkatan: 'DEMO-KUR' } });
  const klasifikasi = await prisma.klasifikasi.upsert({ where: { kode: 'DEMO.01' }, update: {}, create: { kode: 'DEMO.01', nama: '[SINTETIS] Operasional Demo', urutan: 99 } });
  const jenis = await prisma.jenisSurat.upsert({ where: { kode: 'demo-undangan' }, update: {}, create: { kode: 'demo-undangan', nama: '[SINTETIS] Undangan Demo' } });
  const users = {};
  for (const [key, peran, bagian_id, nama] of [
    ['admin', 'superadmin', unit.id, 'Pengelola Sistem'], ['tu', 'tata_usaha', unit.id, 'Operator TU'],
    ['pimpinan', 'kepala_sekolah', unit.id, 'Kepala Sekolah'], ['bagian', 'kepala_bagian', unit2.id, 'Kepala Kurikulum'],
    ['staf', 'guru_staf', unit2.id, 'Staf Pelaksana'], ['staf-lain', 'guru_staf', unit2.id, 'Staf Tanpa Penugasan'],
  ]) users[key] = await prisma.user.upsert({ where: { email: `${key}@demo.batavia.invalid` }, update: {}, create: { email: `${key}@demo.batavia.invalid`, nama_lengkap: `[SINTETIS] ${nama}`, password_hash: hash, peran, bagian_id, password_changed_at: new Date(0) } });
  const now = new Date(); now.setUTCHours(0, 0, 0, 0);
  for (let i = 1; i <= 6; i++) {
    const date = new Date(now); date.setUTCDate(date.getUTCDate() - i * 12);
    const status = ['diterima', 'dibaca_pimpinan', 'didisposisi', 'didisposisi', 'selesai', 'diarsipkan'][i - 1];
    const letter = await prisma.suratMasuk.upsert({ where: { nomor_registrasi: `DEMO-SM-${String(i).padStart(3, '0')}` }, update: {}, create: {
      nomor_registrasi: `DEMO-SM-${String(i).padStart(3, '0')}`, nomor_surat: `SINTETIS/MASUK/${i}`, pengirim: `[SINTETIS] Mitra Sekolah ${i}`,
      perihal: ['Undangan rapat koordinasi', 'Permohonan data pendidikan', 'Koordinasi kegiatan siswa', 'Pelatihan tenaga pendidik', 'Laporan kegiatan selesai', 'Arsip pertemuan sekolah'][i - 1] + ' [SINTETIS]',
      tanggal_surat: date, tanggal_terima: date, klasifikasi_id: klasifikasi.id, jenis_surat_id: jenis.id, dibuat_oleh: users.tu.id, status, sensitif: i === 2,
    } });
    if (i >= 3) {
      const taskStatus = i === 3 ? 'baru' : i === 4 ? 'diproses' : 'selesai';
      const deadline = new Date(now); deadline.setUTCDate(deadline.getUTCDate() + (i === 4 ? -2 : 4));
      const task = await prisma.disposisi.upsert({ where: { id: `demo-disposisi-${i}` }, update: {}, create: {
        id: `demo-disposisi-${i}`, surat_masuk_id: letter.id, dari_user_id: users.pimpinan.id, ke_bagian_id: unit2.id, ke_user_id: users.staf.id,
        instruksi: '[SINTETIS] Telaah surat dan laporkan hasil tindak lanjut.', deadline, status: taskStatus,
        catatan: taskStatus === 'selesai' ? '[SINTETIS] Koordinasi telah diselesaikan.' : null,
      } });
      if (taskStatus !== 'baru') await prisma.tindakLanjut.upsert({ where: { id: `demo-tindak-lanjut-${i}` }, update: {}, create: { id: `demo-tindak-lanjut-${i}`, disposisi_id: task.id, oleh_user_id: users.staf.id, catatan: taskStatus === 'selesai' ? '[SINTETIS] Koordinasi telah diselesaikan.' : '[SINTETIS] Menghubungi mitra terkait.' } });
    }
  }
  for (let i = 1; i <= 5; i++) {
    const date = new Date(now); date.setUTCDate(date.getUTCDate() - i * 9);
    await prisma.suratKeluar.upsert({ where: { nomor_registrasi: `DEMO-SK-${String(i).padStart(3, '0')}` }, update: {}, create: {
      nomor_registrasi: `DEMO-SK-${String(i).padStart(3, '0')}`, nomor_surat: `SINTETIS/KELUAR/${i}`, tujuan: `[SINTETIS] Tujuan ${i}`, perihal: `[SINTETIS] Balasan kegiatan ${i}`,
      tanggal_surat: date, klasifikasi_id: klasifikasi.id, jenis_surat_id: jenis.id, dibuat_oleh: users.tu.id,
      status: ['draft', 'menunggu_tanda_tangan', 'disetujui', 'terkirim', 'diarsipkan'][i - 1],
    } });
  }
  return { pengguna: Object.values(users).map(({ id, email, peran }) => ({ id, email, peran })), surat_masuk: 6, surat_keluar: 5, disposisi: 4 };
}
module.exports = { seedAlur };
if (require.main === module) {
  if (process.env.MODE !== 'lab' || !process.env.DATABASE_URL || process.env.SEED_ALUR_CONFIRM !== 'SINTETIS') {
    console.error('Dibatalkan. Set MODE=lab, DATABASE_URL, DEMO_PASSWORD dan SEED_ALUR_CONFIRM=SINTETIS secara eksplisit.');
    process.exitCode = 1;
  } else {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    seedAlur(prisma).then((data) => console.log(JSON.stringify(data, null, 2))).catch((err) => { console.error(err.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
  }
}
