-- Migrasi aditif katalog demo. Tidak mengubah atau menghapus data surat.
CREATE TABLE "JenisSurat" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "kode" TEXT NOT NULL,
  "nama" TEXT NOT NULL,
  "keterangan" TEXT,
  "aktif" BOOLEAN NOT NULL DEFAULT true,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME NOT NULL
);
CREATE TABLE "JenisArsip" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "kode" TEXT NOT NULL,
  "nama" TEXT NOT NULL,
  "keterangan" TEXT,
  "aktif" BOOLEAN NOT NULL DEFAULT true,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "JenisSurat_kode_key" ON "JenisSurat"("kode");
CREATE INDEX "JenisSurat_aktif_idx" ON "JenisSurat"("aktif");
CREATE UNIQUE INDEX "JenisArsip_kode_key" ON "JenisArsip"("kode");
CREATE INDEX "JenisArsip_aktif_idx" ON "JenisArsip"("aktif");
