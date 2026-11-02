/**
 * Health check publik. Satu-satunya endpoint selain /auth/login yang boleh
 * diakses tanpa token.
 *
 * Dipakai:
 *   - script uji-*.js untuk polling kesiapan server
 *   - load balancer / Render untuk cek liveness
 *
 * TIDAK mengecek DB di sini -- liveness check harus murah. Readiness
 * check (termasuk DB ping) tersedia di /api/ready kalau nanti dibutuhkan.
 */
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    ok: true,
    service: 'memoria-lab',
    mode: process.env.MODE,
    waktu: new Date().toISOString(),
  });
});

module.exports = router;
