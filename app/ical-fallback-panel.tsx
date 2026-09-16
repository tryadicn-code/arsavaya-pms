'use client';
import { useState } from 'react';
import {
  CalendarDays,
  Plus,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  Download,
  Pause,
  Play,
  Clock,
  Info,
} from 'lucide-react';
import type { State } from '../lib/pms';

const ICAL_OTAS = ['Airbnb', 'Booking.com', 'Vrbo'] as const;

const dateFmt = (d: string) =>
  new Date(d).toLocaleString('id-ID', {
    timeZone: 'Asia/Makassar',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

export default function IcalFallbackPanel({
  state,
  demo,
  busy,
  save,
}: {
  state: State;
  demo: boolean;
  busy: boolean;
  save: (action: string, payload: unknown) => Promise<boolean | undefined>;
}) {
  const channels = state.channels || { connections: [], events: [], history: [] };
  const [add, setAdd] = useState(false);
  const [view, setView] = useState<'Koneksi' | 'Riwayat'>('Koneksi');
  const [editUrl, setEditUrl] = useState<string | null>(null);

  const unitName = (id: string) =>
    state.units.find((u) => u.id === id)?.name || id;

  const icalConnections = channels.connections.filter((c) => c.mode === 'ical');
  const legacyConnections = channels.connections.filter((c) => c.mode === 'api');

  const onAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const p = Object.fromEntries(new FormData(e.currentTarget));
    // Force iCal mode — API mode is not managed from this panel
    const ok = await save('channel-add', { ...p, mode: 'ical' });
    if (ok) setAdd(false);
  };

  const activeEvents = channels.events.filter((e) => e.status === 'active');

  return (
    <>
      {/* Intro */}
      <div className="note">
        <Info size={14} />
        <span>
          <strong>Fallback Kalender.</strong> iCal digunakan sebagai jalur cadangan untuk
          sinkronisasi kalender dasar saat integrasi channel manager utama tidak tersedia.
          iCal hanya menyinkronkan blok tanggal — bukan detail reservasi, harga, atau
          tamu. Modifikasi dan pembatalan bergantung perilaku feed masing-masing kanal.
        </span>
      </div>

      {/* Tabs */}
      <div className="automation-tabs">
        {(['Koneksi', 'Riwayat'] as const).map((n) => (
          <button
            key={n}
            type="button"
            className={view === n ? 'active' : ''}
            onClick={() => setView(n)}
          >
            {n === 'Koneksi' ? <CalendarDays size={16} /> : <Clock size={16} />}
            {n}
          </button>
        ))}
      </div>

      {view === 'Koneksi' && (
        <>
          <div className="section-actions">
            <span>{icalConnections.length} koneksi iCal aktif</span>
            <button className="primary" type="button" onClick={() => setAdd((v) => !v)}>
              <Plus size={16} />
              {add ? 'Tutup' : 'Tambah koneksi iCal'}
            </button>
          </div>

          {add && (
            <section className="panel">
              <div className="panel-heading">
                <h2>Hubungkan URL kalender iCal</h2>
              </div>
              <form className="settings-form" onSubmit={onAdd}>
                <div className="form-grid">
                  <label className="field">
                    <span>Unit vila</span>
                    <select required name="unit" defaultValue={state.units[0]?.id}>
                      {state.units.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Kanal</span>
                    <select required name="ota" defaultValue="Airbnb">
                      {ICAL_OTAS.map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>ID / nama listing</span>
                    <input
                      required
                      name="listing"
                      maxLength={150}
                      placeholder="Contoh: Villa Ocean — 123456"
                    />
                  </label>
                  <label className="field">
                    <span>URL ekspor kalender</span>
                    <input
                      required
                      type="url"
                      name="url"
                      placeholder="https://..."
                      autoComplete="off"
                    />
                  </label>
                </div>
                <div className="note">
                  Gunakan URL ekspor kalender resmi dari kanal. Jangan masukkan kata
                  sandi atau kredensial akun. URL ini diambil server-side.
                </div>
                <button className="primary" disabled={busy}>
                  Simpan koneksi
                </button>
              </form>
            </section>
          )}

          {!add && icalConnections.length === 0 && (
            <div className="empty">
              <CalendarDays size={26} />
              <h3>Belum ada koneksi iCal</h3>
              <p>
                Tambahkan URL ekspor kalender dari kanal untuk mengaktifkan fallback
                kalender.
              </p>
            </div>
          )}

          {icalConnections.map((c) => (
            <section className="panel channel-card" key={c.id}>
              <div className="between">
                <div>
                  <h3>{c.ota}</h3>
                  <small>
                    {unitName(c.unit)} · {c.listing}
                  </small>
                </div>
                <span
                  className={
                    'badge ' +
                    (!c.enabled
                      ? 'amber'
                      : c.error
                        ? 'red'
                        : c.lastSync
                          ? 'green'
                          : 'amber')
                  }
                >
                  {!c.enabled
                    ? 'Dijeda'
                    : c.error
                      ? 'Perlu diperiksa'
                      : c.lastSync
                        ? 'Aktif'
                        : 'Belum diimpor'}
                </span>
              </div>
              <div className="channel-detail">
                <div>
                  <small>IMPOR TERAKHIR</small>
                  {c.lastSync ? dateFmt(c.lastSync) : 'Belum pernah'}
                </div>
              </div>
              {c.error && <p className="error">{c.error}</p>}
              <div className="button-row">
                <button
                  className="secondary"
                  type="button"
                  disabled={busy || !c.enabled}
                  onClick={() => save('channel-sync', { id: c.id })}
                >
                  <RefreshCw size={15} />
                  Tarik kalender
                </button>
                <a
                  className="secondary"
                  href={
                    '/api/calendar?demo=' +
                    (demo ? 1 : 0) +
                    '&connection=' +
                    encodeURIComponent(c.id)
                  }
                  download
                >
                  <Download size={15} />
                  Unduh kalender
                </a>
                <button
                  className="text-btn"
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    save('channel-toggle', { id: c.id, enabled: !c.enabled })
                  }
                >
                  {c.enabled ? <Pause size={15} /> : <Play size={15} />}
                  {c.enabled ? 'Jeda' : 'Aktifkan'}
                </button>
              </div>
              <button
                className="text-btn"
                type="button"
                onClick={() => setEditUrl(editUrl === c.id ? null : c.id)}
              >
                Ubah URL
              </button>
              {editUrl === c.id && (
                <form
                  className="settings-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const url = new FormData(e.currentTarget).get('url');
                    if (await save('channel-update', { id: c.id, url })) {
                      setEditUrl(null);
                    }
                  }}
                >
                  <label className="field">
                    <span>URL baru</span>
                    <input name="url" type="url" required defaultValue={c.url} />
                  </label>
                  <button className="secondary" disabled={busy}>
                    Simpan
                  </button>
                </form>
              )}
            </section>
          ))}

          {legacyConnections.length > 0 && (
            <div className="note">
              <AlertTriangle size={14} />
              {legacyConnections.length} entri lama tanpa URL iCal tetap tersimpan
              sebagai catatan. Entri ini tidak melakukan sinkronisasi aktif.
            </div>
          )}

          {activeEvents.length > 0 && (
            <section className="panel">
              <div className="panel-heading">
                <h2>Blok tanggal aktif</h2>
                <span className="text-muted">{activeEvents.length} blok</span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Unit</th>
                      <th>Sumber</th>
                      <th>Tanggal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeEvents.slice(0, 20).map((e) => {
                      const conn = channels.connections.find(
                        (c) => c.id === e.connection,
                      );
                      return (
                        <tr key={e.id}>
                          <td>{conn ? unitName(conn.unit) : '—'}</td>
                          <td>{conn?.ota || '—'}</td>
                          <td>
                            {e.start} — {e.end}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}

      {view === 'Riwayat' && (
        <section className="panel">
          <div className="panel-heading">
            <h2>Riwayat impor kalender</h2>
          </div>
          {channels.history.length === 0 ? (
            <div className="empty">
              <Clock size={26} />
              <h3>Belum ada aktivitas impor</h3>
              <p>Hasil impor berhasil dan gagal akan tercatat di sini.</p>
            </div>
          ) : (
            channels.history.map((h) => (
              <div className="automation-history" key={h.id}>
                {h.ok ? <ShieldCheck size={18} /> : <AlertTriangle size={18} />}
                <div>
                  <strong>{h.message}</strong>
                  <small>
                    {channels.connections.find((c) => c.id === h.connection)?.ota ||
                      'Kalender'}
                  </small>
                </div>
                <time>{dateFmt(h.time)}</time>
              </div>
            ))
          )}
        </section>
      )}
    </>
  );
}