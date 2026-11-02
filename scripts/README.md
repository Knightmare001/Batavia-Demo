# scripts/ (root proyek)

Runner lintas-bagian untuk versi lab Batavia. Dipakai dari folder root
proyek lewat Command Prompt Windows:

```
scripts\jalankan-lab.cmd --check      Periksa versi Node dan konfigurasi lab
scripts\jalankan-lab.cmd --prepare    prisma generate + migrate deploy + seed katalog
scripts\jalankan-lab.cmd --demo       Akun dan contoh operasional sintetis (idempoten)
scripts\jalankan-lab.cmd --test       Empat suite uji backend (lihat catatan)
scripts\jalankan-lab.cmd              Jalankan backend 6080 + frontend 5173
```

Isi:

- `jalankan-lab.cmd`: wrapper Command Prompt yang meneruskan argumen ke
  `lab.cjs`. Bila folder `.runtime/` berisi Node portabel ada di mesin
  lokal, wrapper memprioritaskannya; folder itu tidak ikut Git dan
  bukan syarat, pengguna clone cukup memasang Node terpatch sendiri.
- `lab.cjs`: logika runner. Menolak Node di luar versi terpatch
  (22.23.4+, 24.22.1+, 26.12.1+) dan menolak jalan kalau `MODE` bukan
  `lab` atau database bukan SQLite file lokal. Tidak menulis `.env`,
  tidak me-reset database, tidak melakukan deploy.

Catatan `--test`: suite `uji-boot.js` masih memerlukan akun lama
`@memoria.lab` yang tidak dibuat oleh `--demo`. Detail dan alternatif
non-destruktif ada di `backend-lab/README.md` bagian Uji.

Panduan lengkap: `../docs/PANDUAN-MENJALANKAN-LAB.md`.

Script per-bagian (seed, suite uji) tetap tinggal di
`backend-lab/scripts/`.
