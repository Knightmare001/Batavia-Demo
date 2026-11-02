/**
 * Entry point. Hanya listen() ada di sini supaya app.js tetap bisa
 * di-impor oleh script uji tanpa membuka port.
 */
const app = require('./src/app');
const env = require('./src/config/env');

const server = app.listen(env.PORT, env.LAB ? '127.0.0.1' : '0.0.0.0', () => {
  const banner = [
    '',
    '╭──────────────────────────────────────────╮',
    '│  Batavia Lab backend menyala             │',
    `│  Mode    : ${env.MODE.padEnd(30)}│`,
    `│  Port    : ${String(env.PORT).padEnd(30)}│`,
    `│  Health  : http://127.0.0.1:${env.PORT}/api/health`.padEnd(44) + '│',
    '╰──────────────────────────────────────────╯',
    '',
  ].join('\n');
  console.log(banner);
});

// Shutdown rapi: SIGINT dari Ctrl+C, SIGTERM dari process manager.
function matikan(sinyal) {
  console.log(`\n[${sinyal}] menutup server...`);
  server.close(() => {
    console.log('[server] tertutup bersih.');
    process.exit(0);
  });
  setTimeout(() => {
    console.error('[server] tutup paksa setelah 5 detik.');
    process.exit(1);
  }, 5000).unref();
}

process.on('SIGINT', () => matikan('SIGINT'));
process.on('SIGTERM', () => matikan('SIGTERM'));
