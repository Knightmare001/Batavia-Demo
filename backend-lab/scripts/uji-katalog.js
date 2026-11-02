/** Uji HTTP katalog memakai SQLite sementara, bukan database kerja. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, mkdirSync, readFileSync, rmSync } = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { randomBytes } = require('node:crypto');

const root = path.resolve(__dirname, '..');
const scratch = process.env.TMPDIR || path.join(process.env.LOCALAPPDATA || require('node:os').homedir(), 'batavia-tests');
mkdirSync(scratch, { recursive: true });
const dir = mkdtempSync(path.join(scratch, 'batavia-uji-'));
process.env.MODE = 'lab';
process.env.PORT = '6089';
process.env.JWT_SECRET = randomBytes(32).toString('hex');
process.env.DATABASE_URL = `file:${path.join(dir, 'uji.db').replaceAll('\\', '/')}`;
process.env.LOGIN_RATE_LIMIT_MAX = '100';
const cli = path.join(root, 'node_modules/prisma/build/index.js');
const hasil = spawnSync(process.execPath, [cli, 'migrate', 'deploy'], {
  cwd: root, env: process.env, encoding: 'utf8', timeout: 60000,
});
assert.equal(hasil.status, 0, hasil.stderr || hasil.stdout);
const prisma = require('../src/config/database');
const app = require('../src/app');
const jwt = require('jsonwebtoken');
let server;

const token = (user) => jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

test('Katalog demo: CRUD aman, izin, audit, seed dan validasi', async (t) => {
  try {
    const admin = await prisma.user.create({ data: {
      email: 'admin@uji.invalid', nama_lengkap: 'Admin Sintetis', password_hash: 'bukan-login',
      peran: 'superadmin', password_changed_at: new Date(0),
    } });
    const tu = await prisma.user.create({ data: {
      email: 'tu@uji.invalid', nama_lengkap: 'TU Sintetis', password_hash: 'bukan-login',
      peran: 'tata_usaha', password_changed_at: new Date(0),
    } });
    server = await new Promise((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    const base = `http://127.0.0.1:${server.address().port}/api`;
    const req = async (method, url, body, user = admin) => {
      const r = await fetch(base + url, {
        method, headers: {
          ...(user ? { Authorization: `Bearer ${token(user)}` } : {}),
          'Content-Type': 'application/json',
        }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
      return { status: r.status, body: await r.json() };
    };
    await t.test('origin loopback lab diterima, origin asing ditolak 403', async () => {
      for (const origin of ['http://127.0.0.1:5173', 'http://localhost:5173']) {
        const r = await fetch(base + '/health', { headers: { Origin: origin } });
        assert.equal(r.status, 200);
        assert.equal(r.headers.get('access-control-allow-origin'), origin);
      }
      assert.equal((await fetch(base + '/health', { headers: { Origin: 'https://asing.invalid' } })).status, 403);
    });
    await t.test('tanpa login 401; TU tidak boleh menulis 403', async () => {
      assert.equal((await req('GET', '/katalog/surat', undefined, null)).status, 401);
      assert.equal((await req('POST', '/katalog/surat', { kode: 'uji', nama: 'Uji' }, tu)).status, 403);
    });
    await t.test('nama tabel tidak boleh berasal dari input bebas', async () => {
      for (const j of ['user', '__proto__', 'constructor']) {
        assert.equal((await req('GET', `/katalog/${j}`)).status, 400, j);
      }
    });
    for (const jenis of ['surat', 'arsip']) {
      await t.test(`${jenis}: tambah, duplikat, ubah, nonaktif dan baca`, async () => {
        const r = await req('POST', `/katalog/${jenis}`, { kode: 'uji-jenis', nama: 'Contoh Uji' });
        assert.equal(r.status, 201, JSON.stringify(r.body));
        const id = r.body.data.id;
        assert.equal((await req('POST', `/katalog/${jenis}`, { kode: 'UJI-JENIS', nama: 'Lain' })).status, 409);
        assert.equal((await req('PATCH', `/katalog/${jenis}/${id}`, { nama: 'Diperbarui', aktif: false })).status, 200);
        const daftar = await req('GET', `/katalog/${jenis}`, undefined, tu);
        assert.equal(daftar.status, 200);
        assert.equal(daftar.body.data.find((x) => x.id === id).nama, 'Diperbarui');
        const aktif = await req('GET', `/katalog/${jenis}?aktif=1`);
        assert.equal(aktif.body.data.some((x) => x.id === id), false);
        assert.equal((await req('PATCH', `/katalog/${jenis}/${id}`, { aktif: true })).status, 200);
      });
    }
    await t.test('isian invalid ditolak; tidak ada mass assignment', async () => {
      const invalid = [null, [], { nama: 42 }, { nama: 'x', kode: 'x', aktif: 'false' },
        { nama: 'x'.repeat(121), kode: 'panjang' }, { nama: 'x', kode: '../user' },
        { nama: 'x', kode: 'x', peran: 'superadmin' }];
      for (const body of invalid) {
        assert.equal((await req('POST', '/katalog/surat', body)).status, 400, JSON.stringify(body));
      }
      assert.equal((await req('PATCH', '/katalog/surat/bukan-uuid', { nama: 'x' })).status, 400);
      assert.equal((await req('PATCH', '/katalog/surat/00000000-0000-4000-8000-000000000001', { nama: 'x' })).status, 404);
    });
    await t.test('matriks TU mempertahankan identitas dan tidak mengaku punya hak tulis katalog', async () => {
      const r = await req('GET', '/auth/izin-saya', undefined, tu);
      assert.equal(r.body.data.user.id, tu.id);
      assert.equal(r.body.data.user.nama, 'TU Sintetis');
      assert.equal(r.body.data.izin.jenis_surat.create.boleh, false);
      assert.equal(r.body.data.izin.jenis_arsip.update.boleh, false);
    });
    await t.test('grant, revoke, reset katalog sesuai matriks pada request berikutnya', async () => {
      const where = { user_id_resource_action: { user_id: tu.id, resource: 'jenis_surat', action: 'create' } };
      await prisma.userPermission.upsert({ where, create: { user_id: tu.id, resource: 'jenis_surat', action: 'create', allowed: true }, update: { allowed: true } });
      assert.equal((await req('POST', '/katalog/surat', { kode: 'delegasi', nama: 'Delegasi TU' }, tu)).status, 201);
      await prisma.userPermission.update({ where, data: { allowed: false } });
      assert.equal((await req('POST', '/katalog/surat', { kode: 'dicabut', nama: 'Tidak Boleh' }, tu)).status, 403);
      await prisma.userPermission.delete({ where });
      assert.equal((await req('POST', '/katalog/surat', { kode: 'bawaan', nama: 'Kembali Bawaan' }, tu)).status, 403);
    });
    await t.test('izin baca eksplisit ditolak di server', async () => {
      await prisma.userPermission.create({ data: { user_id: tu.id, resource: 'jenis_surat', action: 'read', allowed: false } });
      assert.equal((await req('GET', '/katalog/surat', undefined, tu)).status, 403);
      assert.equal((await req('GET', '/katalog/arsip', undefined, tu)).status, 200);
    });
    await t.test('tulis bersamaan berkode sama: satu berhasil, satu 409', async () => {
      const res = await Promise.all([1, 2].map(() => req('POST', '/katalog/surat', { kode: 'serentak', nama: 'Serentak' })));
      assert.deepEqual(res.map((r) => r.status).sort(), [201, 409]);
      assert.equal(await prisma.jenisSurat.count({ where: { kode: 'serentak' } }), 1);
    });
    await t.test('audit sukses tercatat sebelum response; kegagalan tidak dicatat', async () => {
      const { drainAudit } = require('../src/middleware/logActivity');
      const sebelum = await prisma.activityLog.count();
      const r = await req('POST', '/katalog/surat', { kode: 'diaudit', nama: 'Audit Uji' });
      assert.equal(r.status, 201);
      await drainAudit();
      assert.equal(await prisma.activityLog.count(), sebelum + 1);
      assert.equal(await prisma.activityLog.count({ where: { entitas_id: r.body.data.id } }), 1);
      await req('POST', '/katalog/surat', { kode: 'diaudit', nama: 'Duplikat' });
      await drainAudit();
      assert.equal(await prisma.activityLog.count(), sebelum + 1);
    });
    await t.test('seed katalog idempoten dan mempertahankan edit admin', async () => {
      const { seedKatalog } = require('./seed-katalog');
      await seedKatalog(prisma);
      await prisma.jenisSurat.update({ where: { kode: 'izin' }, data: { nama: 'Diubah Admin', aktif: false } });
      const jumlah = await prisma.jenisSurat.count();
      await seedKatalog(prisma);
      assert.equal(await prisma.jenisSurat.count(), jumlah);
      const izin = await prisma.jenisSurat.findUnique({ where: { kode: 'izin' } });
      assert.equal(izin.nama, 'Diubah Admin');
      assert.equal(izin.aktif, false);
    });
  } finally {
    if (server) { server.closeAllConnections(); await new Promise((r) => server.close(r)); }
    await prisma.$disconnect();
    rmSync(dir, { recursive: true, force: true });
  }
});
