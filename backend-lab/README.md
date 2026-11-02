# Batavia Lab: Backend

Backend REST API versi lab. Express 4 + Prisma 6 + SQLite file lokal.
Dev-only. Jangan deploy ke internet publik, jangan isi data nyata.

Cara setup dan menjalankan yang dianjurkan memakai runner dari folder
root proyek. Lihat `../docs/PANDUAN-MENJALANKAN-LAB.md`. Ringkasnya,
dari root:

```
scripts\jalankan-lab.cmd --prepare    generate client, migrate deploy, seed katalog
scripts\jalankan-lab.cmd --demo       akun dan contoh operasional (idempoten)
scripts\jalankan-lab.cmd              jalankan backend + frontend
```

## Setup manual (alternatif)

```
npm ci
copy .env.contoh .env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Salin hasil perintah terakhir ke `JWT_SECRET` di `.env`. Pastikan
`MODE=lab`, `PORT=6080`, dan `DATABASE_URL="file:./dev.db"`. Lalu:

```
npx prisma generate
npx prisma migrate deploy
node scripts/seed-katalog.js
```

Jangan memakai `prisma migrate dev` atau `npm run seed` untuk setup
pertama. `npm run seed` (seed-demo.js) MENGHAPUS data lab lalu mengisi
ulang akun lama `@memoria.lab`; gunakan hanya kalau memang ingin reset
total.

Server menyala di `http://127.0.0.1:6080`. Cek cepat:
`http://127.0.0.1:6080/api/health` harus menjawab JSON `ok: true`.

## Akun demo

Dibuat oleh `scripts\jalankan-lab.cmd --demo` dari root. Sandi publik
`DemoBatavia123!`, hanya untuk lab loopback. Daftar akun ada di
`../README.md`. Akun lama `@memoria.lab` (sandi `demo1234`) hanya ada
bila lab pernah di-seed dengan skrip lama; `--demo` tidak membuatnya.

## Script npm

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Server dengan auto-restart |
| `npm start` | Server biasa |
| `npm run seed` | DESTRUKTIF: hapus semua data lalu seed ulang akun lama |
| `npm run seed:katalog` | Seed katalog saja, non-destruktif |
| `npm run uji` | Empat suite uji (lihat catatan di bawah) |
| `npm run prisma:deploy` | Terapkan migrasi yang ada |
| `npm run prisma:studio` | GUI inspeksi database |

## Uji

Keterbatasan terbuka: suite `uji-boot.js` masih mengharapkan akun
lama `superadmin@memoria.lab` dengan sandi `demo1234`. Fresh clone yang
hanya menjalankan `--prepare` dan `--demo` TIDAK memiliki akun itu,
sehingga `uji-boot.js` gagal pada bagian login seed. Perbaikan fixture
uji adalah pekerjaan terpisah.

Alternatif non-destruktif yang tidak bergantung pada akun lama, dari
folder `backend-lab` dengan server lab dimatikan:

```
node --test scripts/uji-katalog.js scripts/uji-alur.js scripts/uji-pengguna.js
```

- `uji-katalog.js`: CRUD katalog dan grant/revoke hak tulis.
- `uji-alur.js`: alur surat masuk, disposisi, dan surat keluar.
- `uji-pengguna.js`: manajemen akun dan kendali izin.

Ketiganya memakai database uji terpisah, bukan `dev.db` kerja.

## Rute dasar

| Metode | Rute | Akses |
|---|---|---|
| GET | `/api/health` | publik |
| POST | `/api/auth/login` | publik |
| GET | `/api/auth/izin-saya` | login |

Rute lain mengikuti modul surat masuk, surat keluar, disposisi,
katalog, dan manajemen user. Pemeriksaan akses dilakukan di server
sesuai peran dan lingkup.
