/** Runner lab: tidak menulis .env, tidak reset DB, tidak deploy. */
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const backend = path.join(root, 'backend-lab');
const frontend = path.join(root, 'frontend-lab');
const [major, minor, patch] = process.versions.node.split('.').map(Number);
const aman = (major === 22 && (minor > 23 || (minor === 23 && patch >= 4)))
  || (major === 24 && (minor > 22 || (minor === 22 && patch >= 1)))
  || (major === 26 && (minor > 12 || (minor === 12 && patch >= 1)));
if (!aman) {
  console.error('Gunakan Node terpatch 22.23.4+, 24.22.1+, atau 26.12.1+ pada cabang tersebut.');
  process.exit(1);
}
require(path.join(backend, 'node_modules/dotenv')).config({ path: path.join(backend, '.env') });
if (process.env.MODE !== 'lab' || !process.env.DATABASE_URL?.startsWith('file:')) {
  console.error('Runner hanya untuk MODE=lab dan SQLite file lokal. Tidak menyentuh DB produksi.');
  process.exit(1);
}
const command = process.argv[2] || '--run';
function sekali(file, args = [], cwd = backend) {
  const r = spawnSync(process.execPath, [file, ...args], { cwd, env: process.env, stdio: 'inherit' });
  if (r.error || r.status !== 0) process.exit(r.status || 1);
}
const prisma = path.join(backend, 'node_modules/prisma/build/index.js');
if (command === '--prepare') {
  sekali(prisma, ['generate']);
  sekali(prisma, ['migrate', 'deploy']);
  sekali(path.join(backend, 'scripts/seed-katalog.js'));
  console.log('Lab siap. Data lama tidak di-reset. Akun demo baru: lihat backend-lab/README.md.');
} else if (command === '--demo') {
  // Kredensial publik khusus data sintetis pada lab loopback, bukan produksi.
  process.env.SEED_ALUR_CONFIRM = 'SINTETIS';
  process.env.DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'DemoBatavia123!';
  sekali(path.join(backend, 'scripts/seed-alur.js'));
} else if (command === '--check') {
  console.log(`Node ${process.versions.node}; MODE=lab; DB lokal. Pemeriksaan konfigurasi awal OK.`);
} else if (command === '--test') {
  sekali('--test', ['scripts/uji-boot.js', 'scripts/uji-katalog.js', 'scripts/uji-alur.js', 'scripts/uji-pengguna.js']);
} else if (command === '--run') {
  const children = [];
  let stopping = false;
  function stop(code) {
    if (stopping) return;
    stopping = true;
    for (const child of children) child.kill();
    setTimeout(() => process.exit(code), 600).unref();
  }
  for (const [file, cwd, vars] of [
    [path.join(backend, 'server.js'), backend, {}],
    [path.join(frontend, 'node_modules/vite/bin/vite.js'), frontend, { VITE_API_BASE: '/api' }],
  ]) {
    const child = spawn(process.execPath, [file], { cwd, stdio: 'inherit', env: { ...process.env, ...vars } });
    children.push(child);
    child.on('error', (e) => { console.error(e.message); stop(1); });
    child.on('exit', (code) => stop(code || 0));
  }
  process.on('SIGINT', () => stop(0));
  process.on('SIGTERM', () => stop(0));
  console.log('Batavia Lab: http://127.0.0.1:5173 . Ctrl+C menutup kedua server.');
} else {
  console.error('Pilihan: --check, --prepare (migrasi aditif + seed katalog), --demo (contoh operasional non-destruktif), --test, --run.');
  process.exit(1);
}
