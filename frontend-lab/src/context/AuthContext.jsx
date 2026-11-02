/**
 * AuthContext: siapa yang login, matriks izin, re-fetch berkala.
 *
 * Mirip pola wms-Midas. `izinSiap` menahan render sampai percobaan
 * pengambilan matriks selesai (sukses atau gagal), supaya tombol yang
 * seharusnya tersembunyi tidak sempat berkedip.
 */
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api, { getToken, setToken } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [izin, setIzin] = useState(null);
  const [izinSiap, setIzinSiap] = useState(false);
  const [memulihkan, setMemulihkan] = useState(true);

  const bersihkan = useCallback(() => {
    setToken(null);
    setUser(null);
    setIzin(null);
    setIzinSiap(false);
  }, []);

  const segarkanIzin = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/izin-saya');
      setIzin(data.data.izin || {});
      setUser(data.data.user);
    } catch (e) {
      setIzin({});
      if ([401, 403].includes(e.response?.status)) bersihkan();
    } finally {
      setIzinSiap(true);
    }
  }, [bersihkan]);

  // Boot: kalau ada token tersimpan, coba ambil izin -> paham user masih valid.
  useEffect(() => {
    (async () => {
      if (!getToken()) {
        setMemulihkan(false);
        return;
      }
      try {
        const { data } = await api.get('/auth/izin-saya');
        setUser(data.data.user);
        setIzin(data.data.izin || {});
        setIzinSiap(true);
      } catch (e) {
        bersihkan();
      } finally {
        setMemulihkan(false);
      }
    })();
  }, [bersihkan]);

  // Live refresh: fokus, visibilitas, interval 60 detik. Pola wms-Midas.
  useEffect(() => {
    if (!user) return undefined;
    const onFokus = () => segarkanIzin();
    const onVis = () => { if (document.visibilityState === 'visible') segarkanIzin(); };
    window.addEventListener('focus', onFokus);
    document.addEventListener('visibilitychange', onVis);
    const timer = setInterval(segarkanIzin, 60000);
    return () => {
      window.removeEventListener('focus', onFokus);
      document.removeEventListener('visibilitychange', onVis);
      clearInterval(timer);
    };
  }, [user, segarkanIzin]);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    setToken(data.data.token);
    setUser(data.data.user);
    await segarkanIzin();
  };

  const logout = () => bersihkan();

  const boleh = (resource, aksi) => {
    if (!izin) return false;
    const r = izin[resource];
    if (!r) return false;
    const a = r[aksi];
    if (!a) return false;
    return a.boleh === true || a === true;
  };

  return (
    <AuthContext.Provider value={{
      user, izin, izinSiap, memulihkan,
      login, logout, segarkanIzin, boleh,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus dipakai di dalam AuthProvider');
  return ctx;
}
