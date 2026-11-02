# Panduan Git: Commit dan Push Pertama ke GitHub

Panduan ini untuk menyiapkan repositori Git lokal Batavia dan melakukan
commit serta push pertama ke GitHub secara MANUAL. Semua perintah
memakai Command Prompt dari folder root `Batavia`.

Prasyarat: Git terpasang (`git --version`). CLI `gh` tidak dipakai.

## 1. Prinsip

- Push dilakukan manual oleh anggota tim. Tidak ada sinkronisasi
  otomatis, tidak ada CI.
- Jangan pernah memakai `--force`, `reset --hard`, atau `git add -f`.
- `.gitignore` TIDAK menghapus file lokal; ia hanya membuat file yang
  cocok tidak ditawarkan saat `git add`. File yang SUDAH tracked tidak
  disembunyikan oleh `.gitignore`. Bila kelak ada file yang seharusnya
  privat tapi sudah terlanjur tracked, lepaskan dari index dengan
  `git rm --cached <file>` untuk file yang dimaksud setelah direview,
  bukan dengan reset atau menghapus semuanya.
- Commit pertama memuat snapshot aplikasi yang sudah ada beserta dokumentasi
  publik dan `.gitignore`. Persiapan ini hanya mengubah dokumentasi dan
  `.gitignore`; perubahan program berikutnya dikerjakan terpisah.

## 2. Inisialisasi repositori

Hanya bila folder Batavia belum menjadi repositori Git:

```
git init -b main
git status --short --untracked-files=all
```

Bila sudah ada repositori, jangan menginisialisasi ulang atau mengganti
branch tanpa memeriksa `git status` dan `git branch --show-current`.
File yang tercakup `.gitignore` (misalnya `.env`, `dev.db`, `node_modules/`)
tidak boleh muncul sebagai kandidat.

## 3. Identitas Git (hanya bila belum ada)

Setelah repositori diinisialisasi, periksa:

```
git config user.name
git config user.email
```

Isi hanya nilai yang belum terkonfigurasi. Contoh untuk repositori ini saja:

```
git config --local user.name "NAMA_ANDA"
git config --local user.email "EMAIL_ANDA@contoh.com"
```

Ganti placeholder dengan identitas Anda sendiri atau email noreply GitHub.
Jangan menimpa identitas yang sudah benar atau mengubah konfigurasi global.

## 4. Stage dan periksa

```
git add .gitignore README.md backend-lab frontend-lab scripts docs
git diff --cached --name-only
git diff --cached --stat
git diff --cached
git diff --cached --check
git status --short
```

Periksa hasilnya dengan saksama:

1. Daftar file hanya berisi kode sumber, skrip, skema dan migrasi
   Prisma, `.env.contoh`, `package.json`, `package-lock.json`, README,
   dan dua panduan di `docs/`.
2. TIDAK ada file privat: `.env` asli, `*.db`, isi `node_modules/`,
   `.runtime/`, `storage/`, log, atau folder kerja lokal lain.
3. Tinjau setiap hasil `git diff --cached --check`. Preview awal menemukan
   satu peringatan source lama: `frontend-lab/src/pages/Katalog.jsx:75:
   new blank line at EOF`. Perbaikan kode tersebut sengaja tidak dimasukkan
   ke pekerjaan dokumentasi ini. Hasil pemeriksaan belum sepenuhnya bersih;
   jangan mengabaikan temuan lain atau menyatakan semua pemeriksaan lolos.

Sebelum commit pertama belum ada HEAD, sehingga `git restore --staged`
tidak dapat dipakai. Untuk mengeluarkan file yang tidak seharusnya ikut,
ganti placeholder berikut dengan satu path yang telah diperiksa:

```
git rm --cached -- PATH_FILE_YANG_DIKECUALIKAN
```

Perintah itu hanya mengeluarkan file dari index, bukan menghapus file lokal.
Jangan pakai `-f`. Untuk folder gunakan `git rm -r --cached -- PATH_FOLDER`
hanya setelah memastikan seluruh isinya memang harus dikecualikan. Setelah
sudah ada commit, `git restore --staged -- PATH_FILE` dapat dipakai untuk
unstage perubahan berikutnya.

## 5. Commit

```
git commit -m "Siapkan Batavia lab untuk demo"
```

## 6. Remote GitHub

Buat repositori GitHub KOSONG terlebih dahulu lewat situs GitHub:
tanpa README, tanpa license, tanpa `.gitignore` otomatis. Isi awal apa
pun dari GitHub akan menimbulkan konflik sejarah dengan commit lokal.

Periksa dulu apakah remote sudah ada:

```
git remote -v
```

Bila kosong, tambahkan (ganti placeholder dengan URL repositori Anda):

```
git remote add origin PLACEHOLDER_GITHUB_URL
git remote -v
```

Bila remote `origin` ternyata sudah ada, jangan ditimpa membabi buta.
Konfirmasi dulu URL yang benar, baru bila perlu:

```
git remote set-url origin PLACEHOLDER_GITHUB_URL
```

## 7. Push (langkah terpisah, setelah pemeriksaan)

Lakukan push HANYA setelah daftar staged dan isi commit ditinjau, catatan
pemeriksaan pada langkah 4 dipahami, dan URL remote pada langkah 6 dikonfirmasi.
Pastikan tidak ada rahasia atau dokumen pribadi dalam commit:

```
git push -u origin main
```

Push berikutnya cukup `git push` setelah commit baru. Semua push tetap
manual; tidak ada janji autosync.
