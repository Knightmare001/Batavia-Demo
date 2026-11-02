/**
 * PrismaClient singleton. Pattern: satu instance per proses, re-import
 * di modul mana pun yang perlu DB access. Prisma kalau di-instansiasi
 * beberapa kali membuka connection pool masing-masing dan menguras slot.
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: process.env.MODE === 'lab'
    ? [{ emit: 'event', level: 'query' }, 'warn', 'error']
    : ['warn', 'error'],
});

// Di lab, log query > 500ms supaya cepat ketahuan N+1 atau index yang hilang.
// Pakai env.MODE (bukan process.env langsung) supaya kalau env.js menolak
// MODE invalid, kita tidak terus memakai nilai mentah.
const env = require('./env');
if (env.LAB) {
  prisma.$on('query', (e) => {
    if (e.duration > 500) {
      console.warn(`[prisma] query lambat (${e.duration}ms):`, e.query.slice(0, 120));
    }
  });
}

process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

module.exports = prisma;
