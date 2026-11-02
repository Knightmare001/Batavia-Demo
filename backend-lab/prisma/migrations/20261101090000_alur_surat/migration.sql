-- Perubahan aditif. Tidak mengubah atau menghapus data surat yang sudah ada.
ALTER TABLE "SuratMasuk" ADD COLUMN "jenis_surat_id" TEXT REFERENCES "JenisSurat"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SuratKeluar" ADD COLUMN "jenis_surat_id" TEXT REFERENCES "JenisSurat"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Disposisi" ADD COLUMN "ke_user_id" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Disposisi" ADD COLUMN "catatan" TEXT;
CREATE INDEX "Disposisi_ke_user_id_status_idx" ON "Disposisi"("ke_user_id", "status");
CREATE TABLE "NomorSuratSequence" (
  "tahun" INTEGER NOT NULL,
  "jenis" TEXT NOT NULL,
  "nomor" INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY ("tahun", "jenis")
);
-- Bawa nomor tertinggi format default lama agar alokasi baru tidak bentrok.
INSERT INTO "NomorSuratSequence" ("tahun", "jenis", "nomor")
SELECT CAST(substr("nomor_registrasi", -4) AS INTEGER), 'masuk',
       MAX(CAST(substr("nomor_registrasi", 4, instr(substr("nomor_registrasi", 4), '/') - 1) AS INTEGER))
FROM "SuratMasuk" WHERE "nomor_registrasi" GLOB 'SM/[0-9]*/[IVX]*/[0-9][0-9][0-9][0-9]'
GROUP BY CAST(substr("nomor_registrasi", -4) AS INTEGER);
INSERT INTO "NomorSuratSequence" ("tahun", "jenis", "nomor")
SELECT CAST(substr("nomor_registrasi", -4) AS INTEGER), 'keluar',
       MAX(CAST(substr("nomor_registrasi", 4, instr(substr("nomor_registrasi", 4), '/') - 1) AS INTEGER))
FROM "SuratKeluar" WHERE "nomor_registrasi" GLOB 'SK/[0-9]*/[IVX]*/[0-9][0-9][0-9][0-9]'
GROUP BY CAST(substr("nomor_registrasi", -4) AS INTEGER);
