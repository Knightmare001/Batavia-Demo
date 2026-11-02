import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('superadmin@memoria.lab');
  const [password, setPassword] = useState('demo1234');
  const [proses, setProses] = useState(false);
  const [pesan, setPesan] = useState('');

  async function kirim(e) {
    e.preventDefault();
    setPesan('');
    setProses(true);
    try {
      await login(email, password);
      navigate('/beranda', { replace: true });
    } catch (err) {
      setPesan(err?.response?.data?.message || 'Login gagal.');
    } finally {
      setProses(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy p-6">
      <form onSubmit={kirim} className="w-full max-w-sm space-y-4 rounded-control bg-white p-6 shadow-xl">
        <h1 className="text-2xl font-bold text-navy">Batavia Lab</h1>
        <p className="text-sm text-slate-600">Demo lokal, bukan layanan produksi. Akun contoh masih memakai domain memoria.lab.</p>

        <label className="block">
          <span className="text-sm">Email</span>
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-control border px-3 py-2"
            required
          />
        </label>

        <label className="block">
          <span className="text-sm">Password</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-control border px-3 py-2"
            required
          />
        </label>

        {pesan && (
          <div role="alert" className="rounded-control bg-red-50 p-3 text-sm text-red-700">{pesan}</div>
        )}

        <button
          type="submit"
          disabled={proses}
          className="w-full rounded-control bg-navy px-4 py-2 text-white hover:bg-navy/90 disabled:opacity-60"
        >
          {proses ? 'Memproses...' : 'Masuk'}
        </button>
      </form>
    </div>
  );
}
