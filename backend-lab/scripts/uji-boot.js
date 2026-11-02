/**
 * Uji boot Memoria Lab.
 *
 * Yang paling penting dibuktikan: server WIRED berjalan end-to-end dari
 * sisi autentikasi, izin, dan audit log -- bukan sekadar `app.js` tidak
 * crash saat di-impor.
 *
 * Mengikuti pola uji-*.js dari wms-Midas (lihat skill
 * node-express-smoke-test-harness). Perbedaan untuk Memoria lab:
 *
 *   1. Reproduksi dari clean checkout DI-TUNTUT: kalau backend-lab/.env
 *      hilang, atau JWT_SECRET belum di-generate, uji HARUS GAGAL dengan
 *      pesan yang mengarahkan langkah berikutnya. Jangan pernah pakai
 *      MODE default kalau user belum eksplisit set -- itu menyembunyikan
 *      masalah konfigurasi.
 *
 *   2. Port di-probe DULU sebelum spawn. Kalau port sudah terpakai
 *      (misal `npm run dev` masih jalan di terminal lain), kita bail
 *      lebih awal dengan pesan jelas, bukan menunggu 16 detik polling
 *      sebelum "GAGAL server menyala".
 *
 *   3. Memverifikasi H2 (login_sukses + login_gagal tercatat di
 *      activity_logs) dan H3 (/auth/izin-saya mengembalikan matriks
 *      LENGKAP, bukan {}). Kalau salah satu rusak, uji gagal dan output
 *      menunjukkan baris spesifik yang hilang.
 */
const { spawn } = require('child_process');
const path = require('path');
const net = require('net');
const fs = require('fs');

const BACKEND = path.join(__dirname, '..');
const ENV_PATH = path.join(BACKEND, '.env');

// 1. Sanity env SEBELUM apa pun jalan.
if (!fs.existsSync(ENV_PATH)) {
  console.error('[uji-boot] FATAL: backend-lab/.env tidak ada.');
  console.error('           Jalankan: cp .env.contoh .env, lalu isi JWT_SECRET.');
  process.exit(2);
}
require('dotenv').config({ path: ENV_PATH });
for (const k of ['JWT_SECRET', 'DATABASE_URL', 'PORT', 'MODE']) {
  if (!process.env[k] || !process.env[k].trim()) {
    console.error(`[uji-boot] FATAL: variabel ${k} belum terisi di .env.`);
    process.exit(2);
  }
}
if (process.env.MODE !== 'lab') {
  console.error(`[uji-boot] FATAL: MODE=${process.env.MODE} -- uji HANYA boleh jalan di lab.`);
  process.exit(2);
}
if (process.env.JWT_SECRET === 'ganti-ini-sebelum-run-pertama' ||
    process.env.JWT_SECRET.length < 32) {
  console.error('[uji-boot] FATAL: JWT_SECRET belum di-generate atau terlalu pendek.');
  console.error('           node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  process.exit(2);
}

// 2. Port probe.
const PORT = String(process.env.PORT);
const BASE = `http://127.0.0.1:${PORT}/api`;

function portTerpakai(port) {
  return new Promise((resolve) => {
    const sock = new net.Socket();
    sock.setTimeout(500);
    sock.once('connect', () => { sock.destroy(); resolve(true); });
    sock.once('timeout',  () => { sock.destroy(); resolve(false); });
    sock.once('error',    () => resolve(false));
    sock.connect(parseInt(port, 10), '127.0.0.1');
  });
}

(async () => {
  if (await portTerpakai(PORT)) {
    console.error(`[uji-boot] FATAL: port ${PORT} sudah dipakai.`);
    console.error('           Matikan "npm run dev" atau proses lain yang menggunakan port ini.');
    process.exit(2);
  }

  // 3. Spawn server dengan ENV yang sudah TERVALIDASI (tidak default MODE).
  const srv = spawn(process.execPath, ['server.js'], {
    cwd: BACKEND,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  srv.stdout.on('data', (d) => (log += d));
  srv.stderr.on('data', (d) => (log += d));

  const tidur = (ms) => new Promise((r) => setTimeout(r, ms));

  let lolos = 0, gagal = 0;
  const cek = (nama, ok, ekstra = '') => {
    if (ok) { lolos++; console.log('  OK   ' + nama); }
    else    { gagal++; console.log('  GAGAL ' + nama + (ekstra ? ' :: ' + ekstra : '')); }
  };

  async function req(metode, jalur, opt = {}) {
    const headers = {};
    if (opt.token) headers.Authorization = 'Bearer ' + opt.token;
    let body;
    if (opt.body) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(opt.body); }
    const r = await fetch(BASE + jalur, { method: metode, headers, body });
    let data = null;
    try { data = await r.json(); } catch { data = null; }
    return { status: r.status, body: data };
  }

  try {
    console.log('--- Uji boot Memoria Lab ---');

    // --- 1. Tunggu server siap. Early-abort kalau process keburu exit.
    let siap = false;
    for (let i = 0; i < 40; i++) {
      if (srv.exitCode !== null) break;
      try {
        const r = await fetch(BASE + '/health');
        if (r.ok) { siap = true; break; }
      } catch { /* belum siap */ }
      await tidur(400);
    }
    cek('server menyala di port ' + PORT, siap, siap ? '' : log.slice(-500));
    if (!siap) throw new Error('server tidak kunjung siap');

    // --- 2. Health check.
    const h = await req('GET', '/health');
    cek('health 200',        h.status === 200, 'status=' + h.status);
    cek('health ok=true',    h.body && h.body.ok === true, JSON.stringify(h.body));
    cek('health punya mode', h.body && typeof h.body.mode === 'string');

    // --- 3. Login gagal: enum protection.
    const salah = await req('POST', '/auth/login', {
      body: { email: 'tidakada@memoria.lab', password: 'bukan-password' },
    });
    cek('login salah -> 401',         salah.status === 401);
    cek('pesan generik (anti-enum)',  salah.body?.message === 'Email atau password salah.',
        JSON.stringify(salah.body));

    // --- 4. Login dengan email ter-seed tapi password salah: harus 401 juga,
    //        dan response HARUS sama persis (anti-enum timing/length).
    const salah2 = await req('POST', '/auth/login', {
      body: { email: 'superadmin@memoria.lab', password: 'salah-sekali' },
    });
    cek('login akun ada + password salah -> 401', salah2.status === 401);
    cek('response identik dengan akun tidak ada',
        salah2.body?.message === salah.body?.message);

    // --- 5. Login seed sukses.
    const benar = await req('POST', '/auth/login', {
      body: { email: 'superadmin@memoria.lab', password: 'demo1234' },
    });
    cek('login seed -> 200', benar.status === 200, 'status=' + benar.status);
    cek('response punya token',
        typeof benar.body?.data?.token === 'string',
        JSON.stringify(benar.body).slice(0, 200));

    const token = benar.body?.data?.token;

    // --- 6. /auth/izin-saya DENGAN token: matriks lengkap, BUKAN {}.
    const iz = await req('GET', '/auth/izin-saya', { token });
    cek('izin-saya 200',           iz.status === 200);
    cek('izin-saya peran superadmin',
        iz.body?.data?.peran === 'superadmin');
    cek('izin bukan objek kosong (regression H3)',
        iz.body?.data?.izin && Object.keys(iz.body.data.izin).length >= 10,
        'keys=' + Object.keys(iz.body?.data?.izin || {}).length);
    // Superadmin: semua resource utama harus allowed.
    const RES_UTAMA = ['surat_masuk', 'surat_keluar', 'disposisi', 'user', 'izin'];
    for (const r of RES_UTAMA) {
      cek(`izin ${r}.read.boleh = true (superadmin via role)`,
          iz.body?.data?.izin?.[r]?.read?.boleh === true,
          JSON.stringify(iz.body?.data?.izin?.[r]));
    }

    // --- 7. /auth/izin-saya TANPA token -> 401.
    const noAuth = await req('GET', '/auth/izin-saya');
    cek('izin-saya tanpa token -> 401', noAuth.status === 401);

    // --- 8. Login dengan user TU (non-superadmin): izin bergantung matriks.
    const tu = await req('POST', '/auth/login', {
      body: { email: 'tu@memoria.lab', password: 'demo1234' },
    });
    cek('login TU -> 200', tu.status === 200);
    const izTU = await req('GET', '/auth/izin-saya', { token: tu.body?.data?.token });
    cek('izin TU: surat_masuk.read.boleh = true (default)',
        izTU.body?.data?.izin?.surat_masuk?.read?.boleh === true);
    cek('izin TU: delete.boleh = false (bisa_hapus=false)',
        izTU.body?.data?.izin?.surat_masuk?.delete?.boleh === false);

    // --- 9. Audit log regression (H2): login_sukses + login_gagal tercatat.
    // Baca langsung dari Prisma untuk memastikan audit middleware benar-benar menulis.
    const prisma = require(path.join(BACKEND, 'src/config/database'));
    // Tunggu sebentar supaya fire-and-forget audit sempat flush ke SQLite.
    await tidur(300);
    const jumlahSukses = await prisma.activityLog.count({ where: { aksi: 'login_sukses' } });
    const jumlahGagal  = await prisma.activityLog.count({ where: { aksi: 'login_gagal' } });
    cek('audit log punya >= 2 login_sukses', jumlahSukses >= 2, 'ditemukan=' + jumlahSukses);
    cek('audit log punya >= 2 login_gagal',  jumlahGagal  >= 2, 'ditemukan=' + jumlahGagal);

    // --- 10. Hash chain konsisten di 10 baris terakhir.
    const terakhir = await prisma.activityLog.findMany({
      orderBy: { created_at: 'asc' },
      take: 100,
      select: { prev_hash: true, row_hash: true, id: true },
    });
    let chainOk = true;
    for (let i = 1; i < terakhir.length; i++) {
      if (terakhir[i].prev_hash !== terakhir[i - 1].row_hash) {
        chainOk = false; break;
      }
    }
    cek('hash chain audit konsisten', chainOk,
        chainOk ? '' : 'ada baris yang prev_hash tidak cocok row_hash sebelumnya');
    await prisma.$disconnect();

    console.log('\n===== ' + lolos + ' lolos, ' + gagal + ' gagal =====');
    srv.kill('SIGTERM');
    await tidur(1200);
    process.exit(gagal > 0 ? 1 : 0);
  } catch (e) {
    console.error('\nERROR UJI:', e.message);
    console.error(e.stack);
    console.error('--- server log ---\n' + log);
    srv.kill('SIGKILL');
    process.exit(1);
  }
})().catch((e) => {
  console.error('ERROR GLOBAL:', e.message);
  process.exit(1);
});
