# Batavia Lab: Frontend

React 18 + React Router 7 + Vite 6 + Tailwind CSS 3. Dev-only.
Memanggil backend lab di `127.0.0.1:6080` lewat proxy Vite pada
jalur `/api`.

## Setup

```
npm ci
```

File `.env` TIDAK perlu dibuat. Secara bawaan frontend memanggil `/api`
dan Vite meneruskannya ke backend port 6080 (lihat `vite.config.js`).
`.env.contoh` hanya template opsional.

Cara menjalankan yang dianjurkan dari root proyek:

```
scripts\jalankan-lab.cmd
```

Perintah itu menyalakan backend dan frontend sekaligus. Runner
mengeset `VITE_API_BASE=/api` secara eksplisit. Buka
`http://127.0.0.1:5173`. Panduan lengkap:
`../docs/PANDUAN-MENJALANKAN-LAB.md`.

Alternatif manual: pastikan backend sudah menyala, lalu dari folder ini
jalankan `npm run dev`.

Dev server dikunci ke loopback (`127.0.0.1`). Jangan mengganti `host`
menjadi `0.0.0.0` atau `true`.

## Struktur

```
src/
├── main.jsx            Entry
├── App.jsx             Router + guard rute terlindung
├── index.css           Tailwind directives
├── context/
│   └── AuthContext.jsx user, izin, helper boleh(res,aksi)
├── services/
│   └── api.js          Axios instance + token
├── pages/              Halaman per modul
└── components/         Komponen bersama
```

## Fitur

Login/logout, dashboard sesuai lingkup peran, katalog, surat masuk,
disposisi, surat keluar, dan manajemen user sudah terhubung ke backend.
Laporan unduhan PDF/XLSX dan notifikasi belum ada. Detail status:
`../README.md`.
