# Batavia

Sistem arsip digital sekolah (surat masuk, surat keluar, disposisi).
Dibangun untuk mata kuliah Pengelolaan Proyek Perangkat Lunak,
Universitas Gunadarma.

Status: versi lab/demo. Bukan produksi. Semua data sintetis, kedua
server hanya mendengarkan di loopback (`127.0.0.1`).

## Stack

- Backend: Node.js, Express 4, Prisma 6, SQLite (file lokal).
- Frontend: React 18, React Router 7, Vite 6, Tailwind CSS 3.
- Node.js versi terpatch: 22.23.4+, 24.22.1+, atau 26.12.1+.
  Versi lain ditolak otomatis oleh runner.

## Peta direktori (yang disertakan dalam repositori)

```
Batavia/
├── README.md                      Berkas ini
├── docs/
│   ├── PANDUAN-MENJALANKAN-LAB.md Setup dan menjalankan lab
│   └── PANDUAN-GIT.md             Langkah commit dan push manual
├── scripts/                       Runner lab (lab.cjs, jalankan-lab.cmd)
├── backend-lab/                   Backend lab (Express + Prisma + SQLite)
│   ├── prisma/                    Skema dan migrasi
│   ├── scripts/                   Seed dan suite uji
│   ├── src/                       Kode sumber
│   ├── .env.contoh                Template env (salin menjadi .env)
│   └── package-lock.json          Lockfile untuk npm ci
└── frontend-lab/                  Frontend lab (React + Vite)
    ├── src/                       Kode sumber
    ├── .env.contoh                Opsional, biasanya tidak perlu dibuat
    └── package-lock.json          Lockfile untuk npm ci
```

File `.env` asli, database `dev.db`, dan `node_modules/` sengaja tidak
ikut Git lewat `.gitignore`.

## Setup ringkas

Detail lengkap dan pemecahan masalah: `docs/PANDUAN-MENJALANKAN-LAB.md`.

1. Pasang Node.js terpatch dan npm.
2. `cd backend-lab` lalu `npm ci` dan `copy .env.contoh .env`.
   Isi `JWT_SECRET` di `.env` dengan nilai acak dari
   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
3. `cd ../frontend-lab` lalu `npm ci`. Frontend tidak perlu `.env`.
4. Dari root: `scripts\jalankan-lab.cmd --prepare` lalu
   `scripts\jalankan-lab.cmd --demo`.
5. Jalankan kedua server: `scripts\jalankan-lab.cmd`.
6. Buka `http://127.0.0.1:5173`.

## Akun demo

Dibuat oleh `--demo`, sandi publik `DemoBatavia123!`, hanya untuk lab
loopback dengan data sintetis:

| Email | Peran / lingkup |
|---|---|
| `admin@demo.batavia.invalid` | Superadmin |
| `tu@demo.batavia.invalid` | Tata Usaha |
| `pimpinan@demo.batavia.invalid` | Kepala Sekolah |
| `bagian@demo.batavia.invalid` | Kepala Bagian (unit demo) |
| `staf@demo.batavia.invalid` | Guru/Staf dengan penugasan |
| `staf-lain@demo.batavia.invalid` | Guru/Staf tanpa penugasan |

`--demo` idempoten dan tidak menimpa data atau akun yang sudah ada.

## Fitur dan batas

Sudah ada:
- Sidebar berkelompok, dashboard berisi data sesuai lingkup peran,
  tabel search/filter/pagination, drawer mobile.
- Katalog Jenis Surat/Jenis Arsip: tambah, ubah, nonaktif, grant/revoke
  hak tulis oleh Superadmin.
- Surat masuk: input metadata, nomor registrasi otomatis, lampiran
  privat PDF/PNG/JPG, telaah pimpinan, disposisi ke unit, penerusan ke
  staf, tindak lanjut.
- Surat keluar: draft, permintaan persetujuan, persetujuan pimpinan,
  kirim, arsip.
- Manajemen user: tambah/ubah/nonaktif, kendali izin tiga keadaan,
  aktivitas sistem. Pemeriksaan akses dilakukan di server.

Belum ada:
- Laporan unduhan PDF/XLSX, notifikasi push/email, 2FA.
- Edit metadata surat lengkap di UI.
- Versi produksi dan deploy. Rantai audit belum concurrency-safe.

Ini bukan klaim siap produksi.

## Panduan lain

- Menjalankan lab: `docs/PANDUAN-MENJALANKAN-LAB.md`
- Commit dan push manual ke GitHub: `docs/PANDUAN-GIT.md`
- Detail backend: `backend-lab/README.md`
- Detail frontend: `frontend-lab/README.md`
- Runner: `scripts/README.md`
