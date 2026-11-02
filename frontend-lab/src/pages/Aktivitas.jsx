import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';
import { DataTable, Notice, PageHeader, tanggal, label, pesanError } from '../components/Ui.jsx';

export default function Aktivitas() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => { const t = setTimeout(() => { setQuery(search); setPage(1); }, 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => {
    if (user.peran !== 'superadmin') return;
    let active = true; setLoading(true); setError('');
    api.get('/aktivitas', { params: { q: query, ...filter, page, limit: 10 } }).then((r) => { if (active) { setRows(r.data.data); setMeta(r.data.meta); } }).catch((e) => { if (active) setError(pesanError(e)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [query, filter, page, reload, user.peran]);
  if (user.peran !== 'superadmin') return <Notice error>Aktivitas Sistem hanya tersedia untuk Superadmin.</Notice>;
  return <><PageHeader eyebrow="Administrasi" title="Aktivitas Sistem" description="Jejak tindakan pengguna untuk menelusuri perubahan. Log ini bukan jaminan audit anti-rusak." /><DataTable rows={rows} loading={loading} error={error} onRetry={() => setReload((n) => n + 1)} search={search} onSearch={setSearch} meta={meta} onPage={setPage} filters={{ values: filter, fields: [{ key: 'dari', title: 'Dari tanggal', type: 'date' }, { key: 'sampai', title: 'Sampai tanggal', type: 'date' }] }} onFilters={(v) => { setFilter(v); setPage(1); }} columns={[
    { key: 'created_at', title: 'Waktu', render: (r) => <>{tanggal(r.created_at)}<small>{new Date(r.created_at).toLocaleTimeString('id-ID')}</small></> }, { key: 'nama_user', title: 'Pengguna' }, { key: 'aksi', title: 'Tindakan', render: (r) => label(r.aksi) }, { key: 'entitas', title: 'Data', render: (r) => label(r.entitas) }, { key: 'detail', title: 'Keterangan' },
  ]} /></>;
}
