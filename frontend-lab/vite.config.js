import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Lab: dev server di 5173 (default Vite). Pastikan backend-lab/.env
// CORS_ORIGIN mencakup http://localhost:5173 dan http://127.0.0.1:5173.
export default defineConfig({
  plugins: [react()],
  server: {
    // Hanya loopback. Jangan pakai host: true / --host 0.0.0.0:
    // dev server Vite yang terbuka ke jaringan menjadi target pencurian
    // berkas (CVE-2026-112946, Oktober 2026).
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: { '/api': 'http://127.0.0.1:6080' },
  },
});
