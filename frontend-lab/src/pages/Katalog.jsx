import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';
import { Badge, DataTable, Dialog, Field, Icon, Notice, PageHeader, pesanError } from '../components/Ui.jsx';

const KOSONG = { kode: '', nama: '', keterangan: '', aktif: true };

export default function Katalog() {
  const { jenis } = useParams();
  const { boleh } = useAuth();
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState({});
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(KOSONG);
  const [edit, setEdit] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [message, setMessage] = useState('');
  const [ulang, setUlang] = useState(0);
  const valid = ['surat', 'arsip'].includes(jenis);
  const resource = `jenis_${jenis}`;
  const read = valid && boleh(resource, 'read');
  const title = jenis === 'arsip' ? 'Jenis Arsip' : 'Jenis Surat';
  useEffect(() => {
    let active = true;
    setOpen(false); setRows([]); setError(''); setSearch(''); setFilter({}); setPage(1);
    if (!read) { setLoading(false); return; }
    setLoading(true);
    api.get(`/katalog/${jenis}`).then((r) => { if (active) setRows(r.data.data); }).catch((e) => { if (active) setError(pesanError(e)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [jenis, read, ulang]);
  function begin(item = null) { setEdit(item?.id || null); setForm(item ? { kode: item.kode, nama: item.nama, keterangan: item.keterangan || '', aktif: item.aktif } : KOSONG); setFormError(''); setOpen(true); }
  async function save(e) {
    e.preventDefault(); if (busy) return;
    setBusy(true); setFormError('');
    try {
      const { data } = await api[edit ? 'patch' : 'post'](`/katalog/${jenis}${edit ? `/${edit}` : ''}`, form);
      setRows((prev) => [data.data, ...prev.filter((x) => x.id !== data.data.id)]);
      setMessage(`${data.data.nama} berhasil disimpan.`); setOpen(false);
    } catch (e) { setFormError(pesanError(e)); } finally { setBusy(false); }
  }
  async function toggle(item) {
    if (!window.confirm(`${item.aktif ? 'Nonaktifkan' : 'Aktifkan'} ${item.nama}? Data tetap disimpan.`)) return;
    setBusy(true); setError('');
    try { const { data } = await api.patch(`/katalog/${jenis}/${item.id}`, { aktif: !item.aktif }); setRows((prev) => prev.map((x) => x.id === item.id ? data.data : x)); setMessage(`Status ${item.nama} diperbarui.`); }
    catch (e) { setError(pesanError(e)); } finally { setBusy(false); }
  }
  const filtered = rows.filter((r) => `${r.kode} ${r.nama} ${r.keterangan || ''}`.toLowerCase().includes(search.toLowerCase()) && (!filter.aktif || String(r.aktif) === filter.aktif));
  const pages = Math.max(1, Math.ceil(filtered.length / 10));
  const current = Math.min(page, pages);
  if (!valid) return <Notice error>Katalog tidak dikenal.</Notice>;
  if (!read) return <Notice error>Anda tidak memiliki izin melihat katalog ini.</Notice>;
  return <>
    <PageHeader eyebrow="Katalog" title={title} description="Daftar jenis dipakai saat pencatatan dokumen. Nonaktifkan jenis lama tanpa menghapus riwayatnya." />
    <nav className="tabbar" aria-label="Jenis katalog"><Link to="/katalog/surat" aria-current={jenis === 'surat' ? 'page' : undefined}>Jenis Surat</Link><Link to="/katalog/arsip" aria-current={jenis === 'arsip' ? 'page' : undefined}>Jenis Arsip</Link></nav>
    <Notice>{message}</Notice>
    <DataTable rows={filtered.slice((current - 1) * 10, current * 10)} loading={loading} error={error} onRetry={() => setUlang((n) => n + 1)} search={search} onSearch={(v) => { setSearch(v); setPage(1); }} filters={{ values: filter, fields: [{ key: 'aktif', title: 'Status', options: [{ value: 'true', label: 'Aktif' }, { value: 'false', label: 'Nonaktif' }] }] }} onFilters={(v) => { setFilter(v); setPage(1); }} meta={{ page: current, total: filtered.length, total_pages: pages }} onPage={setPage} action={boleh(resource, 'create') && <button className="button" onClick={() => begin()}><Icon nama="tambah" />Tambah jenis</button>} columns={[
      { key: 'kode', title: 'Kode' }, { key: 'nama', title: 'Nama dan keterangan', render: (r) => <><strong>{r.nama}</strong><small>{r.keterangan || 'Tanpa keterangan'}</small></> },
      { key: 'aktif', title: 'Status', render: (r) => <Badge value={r.aktif ? 'aktif' : 'nonaktif'} /> },
      { key: 'aksi', title: 'Tindakan', render: (r) => boleh(resource, 'update') ? <div className="row-actions"><button className="button button-light button-small" onClick={() => begin(r)} disabled={busy}>Ubah</button><button className="text-button" onClick={() => toggle(r)} disabled={busy}>{r.aktif ? 'Nonaktifkan' : 'Aktifkan'}</button></div> : <small>Hanya baca</small> },
    ]} />
    {open && <Dialog title={edit ? `Ubah ${title.toLowerCase()}` : `Tambah ${title.toLowerCase()}`} onClose={() => { if (!busy) setOpen(false); }}><form onSubmit={save}><Notice error>{formError}</Notice><fieldset disabled={busy} className="form-grid">
      <Field title="Kode" hint="Huruf kecil, angka, tanda hubung. Contoh: izin."><input required maxLength={40} pattern="[a-z0-9]+(-[a-z0-9]+)*" value={form.kode} onChange={(e) => setForm({ ...form, kode: e.target.value })} /></Field>
      <Field title="Nama"><input required maxLength={120} value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} /></Field>
      <div className="full-width"><Field title="Keterangan (opsional)"><textarea rows={3} maxLength={500} value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} /></Field></div>
      <label><input type="checkbox" checked={form.aktif} onChange={(e) => setForm({ ...form, aktif: e.target.checked })} /> Aktif untuk entri baru</label>
    </fieldset><div className="form-actions"><button className="button button-light" type="button" disabled={busy} onClick={() => setOpen(false)}>Batal</button><button className="button" disabled={busy}>{busy ? 'Menyimpan...' : 'Simpan jenis'}</button></div></form></Dialog>}
  </>;
}

