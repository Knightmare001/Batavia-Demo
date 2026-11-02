import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';
import { Badge, DataTable, Dialog, Field, Icon, Notice, PageHeader, label, pesanError, tanggal } from '../components/Ui.jsx';

const STATUS = {
  masuk: ['diterima', 'dibaca_pimpinan', 'didisposisi', 'selesai', 'diarsipkan'],
  keluar: ['draft', 'menunggu_tanda_tangan', 'disetujui', 'terkirim', 'diarsipkan'],
};
const FILTER_AWAL = { status: '', dari: '', sampai: '' };
const referensiKosong = { klasifikasi: [], jenis_surat: [] };
const hariIni = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};
const dibatalkan = (e) => e.code === 'ERR_CANCELED' || e.name === 'AbortError';
const namaAman = (nama) => String(nama || 'lampiran').split(/[\\/]/).pop().replace(/[\x00-\x1f\x7f<>:"|?*]/g, '_').replace(/[. ]+$/g, '').slice(0, 180) || 'lampiran';

// The keyed child resets modal/filter state immediately when /surat/:jenis changes.
export default function Surat() {
  const { jenis } = useParams();
  if (!Object.hasOwn(STATUS, jenis)) return <Notice error>Jenis surat tidak dikenal. Pilih <Link to="/surat/masuk">surat masuk</Link> atau <Link to="/surat/keluar">surat keluar</Link>.</Notice>;
  return <DaftarSurat key={jenis} jenis={jenis} />;
}

function DaftarSurat({ jenis }) {
  const { user, boleh, izinSiap } = useAuth();
  const resource = `surat_${jenis}`;
  const endpoint = `/surat-${jenis}`;
  const masuk = jenis === 'masuk';
  const judul = masuk ? 'Surat Masuk' : 'Surat Keluar';
  const dapatBaca = izinSiap && boleh(resource, 'read');
  const dapatTambah = dapatBaca && ['superadmin', 'tata_usaha'].includes(user?.peran) && boleh(resource, 'create');
  const [cari, setCari] = useState('');
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState(FILTER_AWAL);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pesan, setPesan] = useState(null);
  const [tambah, setTambah] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [ulang, setUlang] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => { setQ(cari.trim()); setPage(1); }, 250);
    return () => clearTimeout(timer);
  }, [cari]);

  useEffect(() => {
    const controller = new AbortController();
    if (!dapatBaca) { setRows([]); setMeta(null); setLoading(false); return () => controller.abort(); }
    if (filter.dari && filter.sampai && filter.dari > filter.sampai) {
      setRows([]); setMeta(null); setLoading(false); setError('Tanggal awal tidak boleh melebihi tanggal akhir.');
      return () => controller.abort();
    }
    setLoading(true); setError(''); setRows([]);
    api.get(endpoint, { params: { q, ...filter, page, limit }, signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        const info = data.meta;
        if (info?.total_pages > 0 && page > info.total_pages) { setPage(info.total_pages); return; }
        setRows(data.data || []); setMeta(info || null);
      })
      .catch((e) => { if (!controller.signal.aborted && !dibatalkan(e)) { setError(pesanError(e)); setMeta(null); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [endpoint, dapatBaca, q, filter, page, limit, ulang]);

  useEffect(() => {
    if (!dapatBaca) { setTambah(false); setDetailId(null); }
    if (!dapatTambah) setTambah(false);
  }, [dapatBaca, dapatTambah]);

  function tersimpan(item, galatUpload) {
    setTambah(false); setUlang((v) => v + 1); setPage(1);
    setPesan({ id: item.id, error: Boolean(galatUpload), text: galatUpload
      ? `Surat ${item.nomor_registrasi || item.nomor_surat || ''} sudah tersimpan, tetapi lampiran gagal diunggah: ${galatUpload} Jangan input ulang surat. Buka detail untuk mencoba unggah kembali.`
      : 'Surat berhasil disimpan.' });
    if (item.id) setDetailId(item.id);
  }

  const aksiTambah = dapatTambah ? <button className="button" type="button" onClick={() => { setPesan(null); setTambah(true); }}><Icon nama="tambah" />Input surat {jenis}</button> : null;
  const columns = [
    { key: 'nomor', title: 'Nomor surat / registrasi', render: (r) => <><strong>{r.nomor_surat || '-'}</strong><small>{r.nomor_registrasi || '-'}</small>{r.sensitif && <small>Terbatas / sensitif</small>}</> },
    { key: masuk ? 'pengirim' : 'tujuan', title: masuk ? 'Pengirim' : 'Tujuan' },
    { key: 'perihal', title: 'Perihal', render: (r) => <>{r.perihal}<small>{r.klasifikasi?.nama || ''}{r.jenis_surat?.nama ? ` · ${r.jenis_surat.nama}` : ''}</small></> },
    { key: 'tanggal_surat', title: 'Tanggal surat', render: (r) => <>{tanggal(r.tanggal_surat)}{masuk && <small>Diterima {tanggal(r.tanggal_terima)}</small>}</> },
    { key: 'status', title: 'Status', render: (r) => <Badge value={r.status} /> },
    { key: 'aksi', title: 'Aksi', render: (r) => <button className="button button-light button-small" type="button" onClick={() => setDetailId(r.id)}>Lihat detail</button> },
  ];

  if (!izinSiap) return <p role="status" className="empty-state">Memuat izin akses...</p>;
  if (!dapatBaca) return <Notice error>Anda tidak memiliki izin membaca {judul.toLowerCase()}.</Notice>;
  return <>
    <PageHeader eyebrow="Administrasi persuratan" title={judul} description={masuk ? 'Catat surat dan scan dari TU, telaah pimpinan, lalu pantau tindak lanjut unit.' : 'Kelola draf, proses persetujuan, pengiriman, dan arsip surat keluar.'} action={aksiTambah} />
    <nav className="tabbar" aria-label="Jenis surat">
      {boleh('surat_masuk', 'read') && <Link to="/surat/masuk" aria-current={masuk ? 'page' : undefined}>Surat masuk</Link>}
      {boleh('surat_keluar', 'read') && <Link to="/surat/keluar" aria-current={!masuk ? 'page' : undefined}>Surat keluar</Link>}
    </nav>
    <Notice error={pesan?.error}>{pesan?.text}</Notice>
    <DataTable columns={columns} rows={rows} loading={loading} error={error} onRetry={() => setUlang((v) => v + 1)} search={cari} onSearch={setCari}
      filters={{ values: filter, fields: [
        { key: 'status', title: 'Status', options: STATUS[jenis].map((value) => ({ value, label: label(value) })) },
        { key: 'dari', title: masuk ? 'Dari tanggal terima' : 'Dari tanggal surat', type: 'date' },
        { key: 'sampai', title: masuk ? 'Sampai tanggal terima' : 'Sampai tanggal surat', type: 'date' },
      ] }} onFilters={(values) => { setFilter({ ...FILTER_AWAL, ...values }); setPage(1); }} meta={meta} onPage={setPage}
      action={<Field title="Baris per halaman"><select aria-label="Baris per halaman" value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}>{[10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}</select></Field>}
      empty={`Belum ada surat ${jenis} yang cocok dengan pencarian dan filter.`} />
    {tambah && dapatTambah && <FormSurat jenis={jenis} dapatUpload={boleh('lampiran', 'create') && boleh(resource, 'update') && ['superadmin', 'tata_usaha'].includes(user?.peran)} onClose={() => setTambah(false)} onSaved={tersimpan} />}
    {detailId && <DetailSurat key={detailId} id={detailId} jenis={jenis} user={user} boleh={boleh} warning={pesan?.error && pesan.id === detailId ? pesan.text : ''} onClose={() => setDetailId(null)} onChanged={() => { setUlang((v) => v + 1); setPesan(null); }} />}
  </>;
}

function FormSurat({ jenis, dapatUpload, onClose, onSaved }) {
  const masuk = jenis === 'masuk';
  const [form, setForm] = useState(() => ({ nomor_surat: '', pengirim: '', tujuan: '', tanggal_surat: hariIni(), tanggal_terima: hariIni(), perihal: '', klasifikasi_id: '', jenis_surat_id: '', sensitif: false }));
  const [refs, setRefs] = useState(referensiKosong);
  const [loading, setLoading] = useState(true);
  const [refError, setRefError] = useState('');
  const [error, setError] = useState('');
  const [ulang, setUlang] = useState(0);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const mutation = useRef(null);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; mutation.current?.abort(); }; }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setRefError('');
    api.get('/referensi', { signal: controller.signal })
      .then(({ data }) => { if (!controller.signal.aborted) setRefs({ ...referensiKosong, ...data.data }); })
      .catch((e) => { if (!controller.signal.aborted && !dibatalkan(e)) setRefError(pesanError(e)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [ulang]);
  const isi = (key) => (e) => setForm((v) => ({ ...v, [key]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    if (lock.current || loading || refError) return;
    if (masuk && form.tanggal_terima < form.tanggal_surat) { setError('Tanggal terima tidak boleh sebelum tanggal surat.'); return; }
    if (!form.perihal.trim() || !(masuk ? form.pengirim : form.tujuan).trim() || (masuk && !form.nomor_surat.trim())) { setError('Lengkapi nomor surat, asal / tujuan, dan perihal dengan teks yang valid.'); return; }
    lock.current = true; setBusy(true); setError('');
    const controller = new AbortController(); mutation.current = controller;
    const payload = { tanggal_surat: form.tanggal_surat, perihal: form.perihal.trim(), klasifikasi_id: form.klasifikasi_id, jenis_surat_id: form.jenis_surat_id, sensitif: form.sensitif };
    if (form.nomor_surat.trim()) payload.nomor_surat = form.nomor_surat.trim();
    if (masuk) Object.assign(payload, { pengirim: form.pengirim.trim(), tanggal_terima: form.tanggal_terima });
    else payload.tujuan = form.tujuan.trim();
    try {
      const { data } = await api.post(`/surat-${jenis}`, payload, { signal: controller.signal });
      const saved = data.data;
      let gagalUpload = '';
      if (file && dapatUpload) {
        try {
          if (!saved?.id) throw new Error('ID surat belum diterima dari server.');
          const body = new FormData(); body.append('file', file);
          await api.post(`/lampiran/${jenis}/${saved.id}`, body, { signal: controller.signal });
        } catch (e) { gagalUpload = e.message === 'ID surat belum diterima dari server.' ? e.message : pesanError(e); }
      }
      // Never re-open the create form after a successful POST, even if upload fails.
      if (alive.current) onSaved(saved || {}, gagalUpload);
    } catch (e) { if (alive.current && !dibatalkan(e)) setError(pesanError(e)); }
    finally { lock.current = false; if (alive.current) setBusy(false); }
  }

  return <Dialog wide title={`Input surat ${jenis}`} onClose={() => { if (!lock.current) onClose(); }}>
    <Notice error>{error || refError}</Notice>
    {refError && <button className="button button-light" type="button" onClick={() => setUlang((v) => v + 1)}>Muat ulang pilihan</button>}
    {loading && <p role="status">Memuat klasifikasi dan jenis surat...</p>}
    <form onSubmit={submit}>
      <fieldset disabled={busy} style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
        <div className="form-grid">
          <Field title={masuk ? 'Nomor surat *' : 'Nomor surat (opsional)'} hint={!masuk ? 'Kosongkan untuk penomoran otomatis oleh server.' : 'Nomor registrasi dibuat otomatis oleh sistem.'}><input required={masuk} maxLength={200} value={form.nomor_surat} onChange={isi('nomor_surat')} /></Field>
          <Field title={masuk ? 'Pengirim *' : 'Tujuan *'}><input required maxLength={300} value={masuk ? form.pengirim : form.tujuan} onChange={isi(masuk ? 'pengirim' : 'tujuan')} /></Field>
          <Field title="Tanggal surat *"><input required type="date" value={form.tanggal_surat} onChange={isi('tanggal_surat')} /></Field>
          {masuk && <Field title="Tanggal terima *"><input required type="date" min={form.tanggal_surat || undefined} value={form.tanggal_terima} onChange={isi('tanggal_terima')} /></Field>}
          <Field title="Klasifikasi *"><select required disabled={loading || Boolean(refError)} value={form.klasifikasi_id} onChange={isi('klasifikasi_id')}><option value="">Pilih klasifikasi</option>{refs.klasifikasi.map((r) => <option key={r.id} value={r.id}>{r.kode ? `${r.kode} · ` : ''}{r.nama}</option>)}</select></Field>
          <Field title="Jenis surat *"><select required disabled={loading || Boolean(refError)} value={form.jenis_surat_id} onChange={isi('jenis_surat_id')}><option value="">Pilih jenis surat</option>{refs.jenis_surat.filter((r) => r.aktif !== false).map((r) => <option key={r.id} value={r.id}>{r.nama}</option>)}</select></Field>
          <div className="full-width"><Field title="Perihal *"><textarea required rows={3} maxLength={2000} value={form.perihal} onChange={isi('perihal')} /></Field></div>
          <label className="row-actions full-width"><input type="checkbox" checked={form.sensitif} onChange={(e) => setForm((v) => ({ ...v, sensitif: e.target.checked }))} />Surat sensitif / akses terbatas</label>
          {dapatUpload && <div className="full-width"><Field title="Scan / lampiran (opsional)" hint="PDF, PNG atau JPG, maksimal 10 MB. Metadata tetap tersimpan jika unggah gagal; ulangi unggah melalui detail surat."><input type="file" accept="application/pdf,image/jpeg,image/png" onChange={(e) => setFile(e.target.files?.[0] || null)} /></Field></div>}
        </div>
        {!loading && !refError && (!refs.klasifikasi.length || !refs.jenis_surat.some((r) => r.aktif !== false)) && <Notice error>Belum ada klasifikasi atau jenis surat aktif. Minta pengelola melengkapi katalog.</Notice>}
        <div className="form-actions"><button type="button" className="button button-light" onClick={onClose}>Batal</button><button className="button" disabled={loading || Boolean(refError) || !refs.klasifikasi.length || !refs.jenis_surat.some((r) => r.aktif !== false)} type="submit">{busy ? 'Menyimpan surat dan lampiran...' : 'Simpan surat'}</button></div>
      </fieldset>
    </form>
  </Dialog>;
}

function DetailSurat({ id, jenis, user, boleh, warning, onClose, onChanged }) {
  const masuk = jenis === 'masuk';
  const resource = `surat_${jenis}`;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [pesan, setPesan] = useState('');
  const [ulang, setUlang] = useState(0);
  const [busy, setBusy] = useState(false);
  const [downloadId, setDownloadId] = useState(null);
  const [file, setFile] = useState(null);
  const fileInput = useRef(null);
  const lock = useRef(false);
  const requests = useRef(new Set());
  const urls = useRef(new Set());
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; requests.current.forEach((c) => c.abort()); urls.current.forEach((url) => URL.revokeObjectURL(url)); }; }, []);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setLoadError('');
    api.get(`/surat-${jenis}/${encodeURIComponent(id)}`, { signal: controller.signal })
      .then(({ data: response }) => { if (!controller.signal.aborted) setData(response.data); })
      .catch((e) => { if (!controller.signal.aborted && !dibatalkan(e)) setLoadError(pesanError(e)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, jenis, ulang]);

  async function jalankan(action) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setPesan('');
    const controller = new AbortController(); requests.current.add(controller);
    try { await action(controller.signal); }
    catch (e) { if (alive.current && !dibatalkan(e)) setError(pesanError(e)); }
    finally { requests.current.delete(controller); lock.current = false; if (alive.current) setBusy(false); }
  }
  function ubahStatus(status) {
    jalankan(async (signal) => {
      await api.patch(`/surat-${jenis}/${encodeURIComponent(id)}`, { status }, { signal });
      if (alive.current) { setPesan(`Status berhasil diubah menjadi ${label(status)}.`); setUlang((v) => v + 1); onChanged(); }
    });
  }
  function unggah(e) {
    e.preventDefault(); if (!file) return;
    jalankan(async (signal) => {
      const body = new FormData(); body.append('file', file);
      await api.post(`/lampiran/${jenis}/${encodeURIComponent(id)}`, body, { signal });
      if (alive.current) { setPesan('Lampiran berhasil diunggah.'); setFile(null); if (fileInput.current) fileInput.current.value = ''; setUlang((v) => v + 1); onChanged(); }
    });
  }
  async function unduh(item) {
    if (downloadId) return;
    const controller = new AbortController(); requests.current.add(controller);
    setDownloadId(item.id); setError('');
    try {
      const response = await api.get(`/lampiran/${encodeURIComponent(item.id)}`, { responseType: 'blob', signal: controller.signal });
      if (!alive.current) return;
      const url = URL.createObjectURL(response.data); urls.current.add(url);
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = namaAman(item.nama_asli); document.body.appendChild(anchor); anchor.click(); anchor.remove();
      setTimeout(() => { URL.revokeObjectURL(url); urls.current.delete(url); }, 1000);
    } catch (e) {
      if (alive.current && !dibatalkan(e)) {
        let message = pesanError(e);
        if (e.response?.data instanceof Blob) {
          try { const body = JSON.parse(await e.response.data.text()); message = body.message || message; } catch { /* Keep the connection error when the response is not JSON. */ }
        }
        if (alive.current) setError(message);
      }
    } finally { requests.current.delete(controller); if (alive.current) setDownloadId(null); }
  }

  const index = STATUS[jenis].indexOf(data?.status);
  const next = masuk ? ({ diterima: 'dibaca_pimpinan', selesai: 'diarsipkan' }[data?.status] || null) : index >= 0 ? STATUS[jenis][index + 1] : null;
  const pimpinan = ['kepala_sekolah', 'superadmin'].includes(user?.peran);
  const dapatStatus = boleh(resource, 'update') && (user?.peran === 'superadmin' || (pimpinan && ['dibaca_pimpinan', 'disetujui'].includes(next)) || (user?.peran === 'tata_usaha' && ['menunggu_tanda_tangan', 'terkirim', 'diarsipkan'].includes(next)));
  const dapatUpload = boleh('lampiran', 'create') && boleh(resource, 'update') && ['superadmin', 'tata_usaha'].includes(user?.peran) && data?.status !== 'diarsipkan' && (masuk || data?.status === 'draft');
  return <Dialog wide title={`Detail surat ${jenis}`} onClose={() => { if (!lock.current) onClose(); }}>
    <Notice error>{loadError || error || warning}</Notice><Notice>{pesan}</Notice>
    {loading ? <p role="status" className="empty-state">Memuat detail surat...</p> : loadError ? <button className="button button-light" onClick={() => setUlang((v) => v + 1)}>Coba lagi</button> : !data ? <Notice error>Detail surat tidak ditemukan.</Notice> : <>
      <dl className="detail-grid">
        <div><dt>Nomor surat</dt><dd>{data.nomor_surat || '-'}</dd></div><div><dt>Nomor registrasi</dt><dd>{data.nomor_registrasi || '-'}</dd></div>
        <div><dt>{masuk ? 'Pengirim' : 'Tujuan'}</dt><dd>{masuk ? data.pengirim : data.tujuan}</dd></div><div><dt>Status</dt><dd><Badge value={data.status} /></dd></div>
        <div><dt>Tanggal surat</dt><dd>{tanggal(data.tanggal_surat)}</dd></div>{masuk && <div><dt>Tanggal terima</dt><dd>{tanggal(data.tanggal_terima)}</dd></div>}
        <div><dt>Klasifikasi</dt><dd>{data.klasifikasi?.nama || '-'}</dd></div><div><dt>Jenis surat</dt><dd>{data.jenis_surat?.nama || '-'}</dd></div>
        <div><dt>Diinput oleh</dt><dd>{data.pembuat?.nama_lengkap || '-'}</dd></div><div><dt>Akses</dt><dd>{data.sensitif ? 'Terbatas / sensitif' : 'Sesuai lingkup dan izin pengguna'}</dd></div>
        <div className="full-width"><dt>Perihal</dt><dd style={{ whiteSpace: 'pre-wrap' }}>{data.perihal}</dd></div>
      </dl>
      {next && dapatStatus && <div className="row-actions" style={{ marginBottom: 22 }}><button className="button" disabled={busy} onClick={() => ubahStatus(next)}>{busy ? 'Menyimpan...' : `Ubah ke ${label(next)}`}</button><small>Perubahan mengikuti urutan alur dan divalidasi server.</small></div>}
      <section aria-label="Lampiran surat" style={{ marginBottom: 22 }}><h2>Lampiran privat</h2>
        {!data.lampiran?.length ? <p className="empty-state">Belum ada lampiran.</p> : <ul>{data.lampiran.map((item) => <li key={item.id} style={{ marginTop: 12 }}><span>{namaAman(item.nama_asli)}{Number.isFinite(item.ukuran_byte) ? ` (${Math.ceil(item.ukuran_byte / 1024)} KB)` : ''}</span> {boleh('lampiran', 'read') && <button className="button button-light button-small" disabled={Boolean(downloadId)} onClick={() => unduh(item)}>{downloadId === item.id ? 'Mengunduh...' : 'Unduh'}</button>}</li>)}</ul>}
        {dapatUpload && <form onSubmit={unggah} style={{ marginTop: 18 }}><Field title="Tambah / coba ulang unggah lampiran" hint="Unggah ke surat yang sudah tersimpan, tanpa membuat surat baru."><input ref={fileInput} required type="file" accept="application/pdf,image/jpeg,image/png" disabled={busy} onChange={(e) => setFile(e.target.files?.[0] || null)} /></Field><div className="form-actions"><button className="button button-light" type="submit" disabled={busy || !file}>{busy ? 'Menyimpan...' : 'Unggah lampiran'}</button></div></form>}
      </section>
      {masuk && <section aria-label="Disposisi surat"><h2>Disposisi dan tindak lanjut</h2>{!data.disposisi?.length ? <p className="empty-state">Surat belum didisposisikan.</p> : <ul>{data.disposisi.map((item) => <li key={item.id} style={{ marginTop: 12 }}><strong>{item.ke_bagian?.nama || 'Unit tujuan'}{item.ke_user?.nama_lengkap ? ` · ${item.ke_user.nama_lengkap}` : ''}</strong> <Badge value={item.status} /><p style={{ whiteSpace: 'pre-wrap', marginTop: 6 }}>{item.instruksi}</p><small>Batas waktu: {tanggal(item.deadline)}</small>{boleh('tindak_lanjut', 'read') && item.tindak_lanjut?.map((t) => <p key={t.id} style={{ whiteSpace: 'pre-wrap', marginTop: 6 }}>{t.oleh?.nama_lengkap || 'Penerima'}: {t.catatan}</p>)}</li>)}</ul>}{boleh('disposisi', 'read') && <div className="form-actions"><Link className="button button-light" to={pimpinan && boleh('disposisi', 'create') ? `/disposisi?surat=${encodeURIComponent(id)}` : '/disposisi'}>{pimpinan && boleh('disposisi', 'create') ? 'Buat disposisi surat ini' : 'Buka disposisi'}</Link></div>}</section>}
    </>}
  </Dialog>;
}
