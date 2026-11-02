/**
 * Axios instance + token management.
 *
 * Token disimpan di memory + localStorage. localStorage dibaca sekali di
 * boot (saat AuthProvider pertama kali render) supaya reload halaman
 * tidak kick user. Setelah itu, state di memory yang jadi truth.
 */
import axios from 'axios';

// Same-origin proxy Vite pada lab menghindari beda localhost/127.0.0.1.
const BASE = import.meta.env.VITE_API_BASE || '/api';

let tokenCache = null;

export function setToken(t) {
  tokenCache = t;
  if (t) localStorage.setItem('memoria_token', t);
  else localStorage.removeItem('memoria_token');
}

export function getToken() {
  if (tokenCache) return tokenCache;
  const t = localStorage.getItem('memoria_token');
  if (t) tokenCache = t;
  return tokenCache;
}

const api = axios.create({ baseURL: BASE });

api.interceptors.request.use((config) => {
  const t = getToken();
  if (t) config.headers.Authorization = 'Bearer ' + t;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // 401 global: kick user. Context akan deteksi lewat state cleaning.
    if (err?.response?.status === 401) {
      setToken(null);
    }
    return Promise.reject(err);
  }
);

export default api;
