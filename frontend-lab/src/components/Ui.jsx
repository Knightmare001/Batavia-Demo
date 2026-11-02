import { useEffect, useId, useRef, useState } from 'react';

export const PERAN = { superadmin: 'Superadmin', tata_usaha: 'Tata Usaha', kepala_sekolah: 'Kepala Sekolah', kepala_bagian: 'Kepala Bagian', guru_staf: 'Guru / Staf' };
export const tanggal = (v) => v ? new Date(v).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
export const label = (v) => (v || '').replaceAll('_', ' ');
export const pesanError = (e) => e.response?.data?.message || 'Permintaan belum berhasil. Periksa koneksi lalu coba lagi.';

export function Icon({ nama = 'surat', ...props }) {
  const paths = {
    dashboard: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
    surat: 'M3 5h18v14H3z M3 6l9 7 9-7',
    katalog: 'M4 3h16v18H4z M8 7h8 M8 11h8 M8 15h5',
    masuk: 'M12 3v12 M7 10l5 5 5-5 M4 15v6h16v-6',
    keluar: 'M12 16V3 M7 8l5-5 5 5 M4 15v6h16v-6',
    disposisi: 'M4 4h7v7H4z M7 11v7h10 M17 14l4 4-4 4',
    pengguna: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M13 3a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
    aktivitas: 'M3 12h4l3-8 4 16 3-8h4',
    cari: 'M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
    menu: 'M3 6h18 M3 12h18 M3 18h18',
    tutup: 'M5 5l14 14 M19 5L5 19',
    tambah: 'M12 4v16 M4 12h16',
    filter: 'M4 6h16 M7 12h10 M10 18h4',
    kunci: 'M5 10h14v11H5z M8 10V6a4 4 0 0 1 8 0v4',
  };
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[nama] || paths.surat} /></svg>;
}

export function Badge({ value }) {
  const baik = ['aktif', 'selesai', 'terkirim', 'diarsipkan'].includes(value);
  const tunggu = ['baru', 'diterima', 'draft', 'menunggu_tanda_tangan'].includes(value);
  return <span className={`badge ${baik ? 'badge-ok' : tunggu ? 'badge-wait' : 'badge-info'}`}>{label(value)}</span>;
}

export function PageHeader({ eyebrow, title, description, action }) {
  return <div className="page-heading"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description && <p className="page-description">{description}</p>}</div>{action}</div>;
}

export function Notice({ error, children }) {
  if (!children) return null;
  return <div className={`notice ${error ? 'notice-error' : 'notice-ok'}`} role={error ? 'alert' : 'status'}>{children}</div>;
}

export function Field({ title, children, hint }) {
  return <label className="field"><span>{title}</span>{children}{hint && <small>{hint}</small>}</label>;
}

// Pola Midas: modal scroll internal, fokus tidak keluar selama modal terbuka.
export function Dialog({ title, children, onClose, wide = false }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  const id = useId();
  closeRef.current = onClose;
  useEffect(() => {
    const before = document.activeElement;
    const el = ref.current;
    const focusables = () => [...el.querySelectorAll('button, input, select, textarea, a[href], [tabindex="0"]')].filter((x) => !x.disabled);
    (focusables()[0] || el).focus();
    function keyboard(e) {
      if (e.key === 'Escape') closeRef.current();
      if (e.key === 'Tab') {
        const nodes = focusables();
        const first = nodes[0]; const last = nodes.at(-1);
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    }
    el.addEventListener('keydown', keyboard);
    return () => { el.removeEventListener('keydown', keyboard); before?.focus(); };
  }, []);
  return <div className="dialog-backdrop"><section ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={id} className={`dialog ${wide ? 'dialog-wide' : ''}`}><header className="dialog-heading"><h2 id={id}>{title}</h2><button className="icon-button" type="button" onClick={onClose} aria-label="Tutup dialog"><Icon nama="tutup" /></button></header><div className="dialog-body">{children}</div></section></div>;
}

// Adaptasi DataTable/BilahAlat Midas: aksi tambah, filter terapkan/reset, scroll.
export function DataTable({ columns, rows, loading, error, onRetry, search, onSearch, filters, onFilters, meta, onPage, action, empty = 'Belum ada data.', minWidth = 720 }) {
  const [showFilter, setShowFilter] = useState(false);
  const [draft, setDraft] = useState({});
  return <section className="panel data-panel">
    <div className="table-toolbar"><div className="search-field"><Icon nama="cari" /><input aria-label="Cari data" type="search" placeholder="Cari nomor, nama, atau perihal..." value={search || ''} onChange={(e) => onSearch?.(e.target.value)} /></div><div className="toolbar-actions">{filters && <button type="button" className="button button-light" aria-expanded={showFilter} onClick={() => { setDraft(filters.values); setShowFilter(!showFilter); }}><Icon nama="filter" />Filter</button>}{action}</div></div>
    {showFilter && <form className="filter-panel" onSubmit={(e) => { e.preventDefault(); onFilters?.(draft); setShowFilter(false); }}>{filters.fields.map((f) => <Field key={f.key} title={f.title}>{f.options ? <select value={draft[f.key] || ''} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}><option value="">Semua</option>{f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select> : <input type={f.type || 'text'} value={draft[f.key] || ''} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} />}</Field>)}<div className="form-actions"><button className="button" type="submit">Terapkan filter</button><button className="button button-light" type="button" onClick={() => { setDraft({}); onFilters?.({}); setShowFilter(false); }}>Reset</button></div></form>}
    {filters && Object.entries(filters.values).some(([, v]) => v) && <div className="filter-chips">{Object.entries(filters.values).filter(([, v]) => v).map(([k, v]) => <button key={k} className="chip" onClick={() => onFilters({ ...filters.values, [k]: '' })}>{filters.fields.find((f) => f.key === k)?.title}: {label(v)} <span aria-hidden="true">×</span></button>)}</div>}
    {error ? <div className="empty-state"><Notice error>{error}</Notice><button type="button" className="button button-light" onClick={onRetry}>Coba lagi</button></div> : loading ? <p className="empty-state" role="status">Memuat data...</p> : !rows.length ? <p className="empty-state">{empty}</p> : <div className="table-scroll" tabIndex={0} aria-label="Tabel data, gulir mendatar untuk melihat semua kolom"><table style={{ minWidth }}><thead><tr>{columns.map((c) => <th key={c.key} scope="col">{c.title}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={r.id || i}>{columns.map((c) => <td key={c.key}>{c.render ? c.render(r) : r[c.key] ?? '-'}</td>)}</tr>)}</tbody></table></div>}
    <footer className="table-footer"><span>{meta?.total ?? rows.length} hasil{meta?.total_pages ? ` · Halaman ${meta.page} dari ${meta.total_pages}` : ''}</span>{onPage && <div className="pagination"><button aria-label="Halaman sebelumnya" className="button button-light" disabled={!meta || meta.page <= 1 || loading} onClick={() => onPage(meta.page - 1)}>Sebelumnya</button><button aria-label="Halaman berikutnya" className="button button-light" disabled={!meta || meta.page >= meta.total_pages || loading} onClick={() => onPage(meta.page + 1)}>Berikutnya</button></div>}</footer>
  </section>;
}
