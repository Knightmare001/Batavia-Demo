-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "nama_lengkap" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "peran" TEXT NOT NULL,
    "bagian_id" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "bisa_hapus" BOOLEAN NOT NULL DEFAULT false,
    "password_changed_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totp_secret_enc" TEXT,
    "totp_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "deleted_at" DATETIME,
    CONSTRAINT "User_bagian_id_fkey" FOREIGN KEY ("bagian_id") REFERENCES "Bagian" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Bagian" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nama" TEXT NOT NULL,
    "singkatan" TEXT NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "deleted_at" DATETIME
);

-- CreateTable
CREATE TABLE "UserPermission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "allowed" BOOLEAN NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserPermission_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Klasifikasi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "retensi_tahun" INTEGER NOT NULL DEFAULT 10,
    "format_registrasi" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "deleted_at" DATETIME
);

-- CreateTable
CREATE TABLE "Agenda" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tahun" INTEGER NOT NULL,
    "jenis" TEXT NOT NULL,
    "klasifikasi_id" TEXT NOT NULL,
    "nomor_urut_terakhir" INTEGER NOT NULL DEFAULT 0,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "Agenda_klasifikasi_id_fkey" FOREIGN KEY ("klasifikasi_id") REFERENCES "Klasifikasi" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SuratMasuk" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nomor_registrasi" TEXT NOT NULL,
    "nomor_surat" TEXT NOT NULL,
    "pengirim" TEXT NOT NULL,
    "tanggal_surat" DATETIME NOT NULL,
    "tanggal_terima" DATETIME NOT NULL,
    "perihal" TEXT NOT NULL,
    "klasifikasi_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'diterima',
    "sensitif" BOOLEAN NOT NULL DEFAULT false,
    "dibuat_oleh" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "deleted_at" DATETIME,
    CONSTRAINT "SuratMasuk_klasifikasi_id_fkey" FOREIGN KEY ("klasifikasi_id") REFERENCES "Klasifikasi" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SuratMasuk_dibuat_oleh_fkey" FOREIGN KEY ("dibuat_oleh") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SuratKeluar" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nomor_registrasi" TEXT NOT NULL,
    "nomor_surat" TEXT NOT NULL,
    "tujuan" TEXT NOT NULL,
    "tanggal_surat" DATETIME NOT NULL,
    "perihal" TEXT NOT NULL,
    "klasifikasi_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "sensitif" BOOLEAN NOT NULL DEFAULT false,
    "dibuat_oleh" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "deleted_at" DATETIME,
    CONSTRAINT "SuratKeluar_klasifikasi_id_fkey" FOREIGN KEY ("klasifikasi_id") REFERENCES "Klasifikasi" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SuratKeluar_dibuat_oleh_fkey" FOREIGN KEY ("dibuat_oleh") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Disposisi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "surat_masuk_id" TEXT NOT NULL,
    "dari_user_id" TEXT NOT NULL,
    "ke_bagian_id" TEXT NOT NULL,
    "instruksi" TEXT NOT NULL,
    "deadline" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'baru',
    "dibaca_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "deleted_at" DATETIME,
    CONSTRAINT "Disposisi_surat_masuk_id_fkey" FOREIGN KEY ("surat_masuk_id") REFERENCES "SuratMasuk" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Disposisi_dari_user_id_fkey" FOREIGN KEY ("dari_user_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Disposisi_ke_bagian_id_fkey" FOREIGN KEY ("ke_bagian_id") REFERENCES "Bagian" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TindakLanjut" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "disposisi_id" TEXT NOT NULL,
    "oleh_user_id" TEXT NOT NULL,
    "catatan" TEXT NOT NULL,
    "selesai_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "TindakLanjut_disposisi_id_fkey" FOREIGN KEY ("disposisi_id") REFERENCES "Disposisi" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TindakLanjut_oleh_user_id_fkey" FOREIGN KEY ("oleh_user_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Lampiran" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entitas_jenis" TEXT NOT NULL,
    "entitas_id" TEXT NOT NULL,
    "nama_asli" TEXT NOT NULL,
    "path_relatif" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "ukuran_byte" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "diupload_oleh" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" DATETIME,
    CONSTRAINT "Lampiran_diupload_oleh_fkey" FOREIGN KEY ("diupload_oleh") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT,
    "nama_user" TEXT NOT NULL,
    "aksi" TEXT NOT NULL,
    "entitas" TEXT NOT NULL,
    "entitas_id" TEXT,
    "detail" TEXT,
    "ip" TEXT,
    "prev_hash" TEXT,
    "row_hash" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivityLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IdempotencyKey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "response_hash" TEXT NOT NULL,
    "response_body" TEXT NOT NULL,
    "response_status" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IdempotencyKey_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_deleted_at_idx" ON "User"("deleted_at");

-- CreateIndex
CREATE INDEX "User_peran_idx" ON "User"("peran");

-- CreateIndex
CREATE UNIQUE INDEX "Bagian_nama_key" ON "Bagian"("nama");

-- CreateIndex
CREATE UNIQUE INDEX "Bagian_singkatan_key" ON "Bagian"("singkatan");

-- CreateIndex
CREATE INDEX "Bagian_deleted_at_idx" ON "Bagian"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "UserPermission_user_id_resource_action_key" ON "UserPermission"("user_id", "resource", "action");

-- CreateIndex
CREATE UNIQUE INDEX "Klasifikasi_kode_key" ON "Klasifikasi"("kode");

-- CreateIndex
CREATE INDEX "Klasifikasi_deleted_at_idx" ON "Klasifikasi"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "Agenda_tahun_jenis_klasifikasi_id_key" ON "Agenda"("tahun", "jenis", "klasifikasi_id");

-- CreateIndex
CREATE UNIQUE INDEX "SuratMasuk_nomor_registrasi_key" ON "SuratMasuk"("nomor_registrasi");

-- CreateIndex
CREATE INDEX "SuratMasuk_deleted_at_idx" ON "SuratMasuk"("deleted_at");

-- CreateIndex
CREATE INDEX "SuratMasuk_status_idx" ON "SuratMasuk"("status");

-- CreateIndex
CREATE INDEX "SuratMasuk_tanggal_surat_idx" ON "SuratMasuk"("tanggal_surat");

-- CreateIndex
CREATE UNIQUE INDEX "SuratKeluar_nomor_registrasi_key" ON "SuratKeluar"("nomor_registrasi");

-- CreateIndex
CREATE INDEX "SuratKeluar_deleted_at_idx" ON "SuratKeluar"("deleted_at");

-- CreateIndex
CREATE INDEX "SuratKeluar_status_idx" ON "SuratKeluar"("status");

-- CreateIndex
CREATE INDEX "SuratKeluar_tanggal_surat_idx" ON "SuratKeluar"("tanggal_surat");

-- CreateIndex
CREATE INDEX "Disposisi_deleted_at_idx" ON "Disposisi"("deleted_at");

-- CreateIndex
CREATE INDEX "Disposisi_status_idx" ON "Disposisi"("status");

-- CreateIndex
CREATE INDEX "Disposisi_ke_bagian_id_status_idx" ON "Disposisi"("ke_bagian_id", "status");

-- CreateIndex
CREATE INDEX "TindakLanjut_disposisi_id_idx" ON "TindakLanjut"("disposisi_id");

-- CreateIndex
CREATE INDEX "Lampiran_entitas_jenis_entitas_id_idx" ON "Lampiran"("entitas_jenis", "entitas_id");

-- CreateIndex
CREATE INDEX "Lampiran_deleted_at_idx" ON "Lampiran"("deleted_at");

-- CreateIndex
CREATE INDEX "ActivityLog_entitas_entitas_id_idx" ON "ActivityLog"("entitas", "entitas_id");

-- CreateIndex
CREATE INDEX "ActivityLog_user_id_idx" ON "ActivityLog"("user_id");

-- CreateIndex
CREATE INDEX "ActivityLog_created_at_idx" ON "ActivityLog"("created_at");

-- CreateIndex
CREATE INDEX "IdempotencyKey_created_at_idx" ON "IdempotencyKey"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyKey_user_id_path_key_key" ON "IdempotencyKey"("user_id", "path", "key");
