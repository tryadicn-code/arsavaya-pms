'use client';
import { useState, useEffect } from 'react';
import {
  Network,
  ShieldCheck,
  Link2,
  RefreshCw,
  AlertTriangle,
  History,
  CalendarDays,
  Plug,
  Check,
  Info,
} from 'lucide-react';
import type { State } from '../lib/pms';
import ChannelsPanel from './channels-panel';
import {
  mapBeds24Status,
  mapBeds24Error,
  extractSafeStatusFields,
  CAPABILITIES_SUPPORTED,
  CAPABILITIES_NOT_SUPPORTED,
  PROVIDER_DISPLAY_NAME,
  PROVIDER_TYPE_LABEL,
  PROVIDER_MODE_LABEL,
  PROVIDER_READONLY_LABEL,
  type Beds24StatusViewModel,
} from './connectivity-helpers';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });
}

export default function ConnectivityPanel({
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
  const [status, setStatus] = useState<Beds24StatusViewModel | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState('');
  const [testing, setTesting] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/integrations/beds24', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'status' }),
        });
        const j = (await r.json()) as Record<string, unknown>;
        if (cancelled) return;
        if (!r.ok) {
          const msg = typeof j.error === 'string' ? j.error : 'Status tidak dapat dimuat';
          throw new Error(msg);
        }
        setStatus(extractSafeStatusFields(j));
        setStatusError('');
      } catch (e) {
        if (cancelled) return;
        setStatusError(mapBeds24Error(e));
      } finally {
        if (!cancelled) setStatusLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  const onTestConnection = async () => {
    if (testing) return;
    setTesting(true);
    setFeedback(null);
    try {
      const r = await fetch('/api/integrations/beds24', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test' }),
      });
      const j = (await r.json()) as Record<string, unknown>;
      if (r.ok && j.ok === true) {
        setFeedback({ kind: 'success', message: 'Koneksi Beds24 berhasil.' });
      } else {
        const rawMsg =
          (typeof j.error === 'string' ? j.error : null) ||
          (typeof j.message === 'string' ? j.message : null) ||
          'Gagal';
        setFeedback({ kind: 'error', message: mapBeds24Error(new Error(rawMsg)) });
      }
      setRefreshTick((t) => t + 1);
    } catch (e) {
      setFeedback({ kind: 'error', message: mapBeds24Error(e) });
    } finally {
      setTesting(false);
    }
  };

  const view = status ? mapBeds24Status(status.health) : null;

  return (
    <>
      {/* B. Provider Overview — Beds24 card */}
      <section className="panel">
        <div className="panel-heading">
          <h2>Channel Manager Provider</h2>
          <Network size={18} />
        </div>
        <div className="between">
          <div>
            <h3>{PROVIDER_DISPLAY_NAME}</h3>
            <p>{PROVIDER_TYPE_LABEL}</p>
          </div>
          <div className="inline">
            <span className="badge blue">{PROVIDER_MODE_LABEL}</span>
            <span className="badge">{PROVIDER_READONLY_LABEL}</span>
          </div>
        </div>
        <div className="note">
          ARSAVAYA menerima data reservasi melalui Beds24. Koneksi OTA dikelola di dalam Beds24.
        </div>
      </section>

      {/* C. Beds24 Status */}
      <section className="panel">
        <div className="panel-heading">
          <h2>Status Koneksi</h2>
          <ShieldCheck size={18} />
        </div>

        {statusLoading && (
          <div className="empty">
            <RefreshCw size={22} />
            <p>Memuat status Beds24…</p>
          </div>
        )}

        {!statusLoading && statusError && (
          <div className="empty">
            <AlertTriangle size={22} />
            <p>{statusError}</p>
            <button className="secondary" onClick={() => setRefreshTick((t) => t + 1)}>
              Coba lagi
            </button>
          </div>
        )}

        {!statusLoading && !statusError && status && (
          <>
            <div className="detail-grid">
              <div>
                <small>PROVIDER</small>
                <strong>{PROVIDER_DISPLAY_NAME}</strong>
              </div>
              <div>
                <small>MODE</small>
                <strong>
                  {PROVIDER_MODE_LABEL} · {PROVIDER_READONLY_LABEL}
                </strong>
              </div>
              <div>
                <small>KREDENSIAL</small>
                <strong>
                  {status.configured ? 'Terkonfigurasi' : 'Belum dikonfigurasi'}
                </strong>
              </div>
              <div>
                <small>KONEKSI</small>
                <strong>
                  {status.connectionStatus === 'CONNECTED'
                    ? 'Terhubung'
                    : status.connectionStatus === 'ERROR'
                      ? 'Gangguan koneksi'
                      : 'Belum diuji'}
                </strong>
              </div>
              {view && (
                <div>
                  <small>STATUS KESELURUHAN</small>
                  <span className={`badge ${view.tone}`}>{view.label}</span>
                </div>
              )}
              {status.lastSyncAt && (
                <div>
                  <small>SINKRONISASI TERAKHIR</small>
                  <strong>{formatTime(status.lastSyncAt)}</strong>
                </div>
              )}
            </div>

            {status.lastError && (
              <div className="error" role="alert">
                {status.lastError}
              </div>
            )}

            <div className="button-row">
              <button className="primary" disabled={testing} onClick={onTestConnection}>
                <Plug size={16} />
                {testing ? 'Menguji koneksi…' : 'Test Connection'}
              </button>
            </div>

            {feedback && (
              <p
                className={feedback.kind === 'success' ? 'note' : 'error'}
                role={feedback.kind === 'success' ? 'status' : 'alert'}
              >
                {feedback.kind === 'success' ? <Check size={14} /> : <AlertTriangle size={14} />}{' '}
                {feedback.message}
              </p>
            )}
          </>
        )}
      </section>

      {/* C2. Capabilities */}
      <section className="panel">
        <div className="panel-heading">
          <h2>Kapabilitas</h2>
        </div>
        <p className="note">
          <strong>Didukung:</strong> {CAPABILITIES_SUPPORTED.join(' · ')}
        </p>
        <p className="note">
          <strong>Belum didukung:</strong> {CAPABILITIES_NOT_SUPPORTED.join(' · ')}
        </p>
        <div className="inline">
          <Info size={14} />
          <small className="text-muted">
            Fitur yang belum didukung bukan berarti bermasalah — memang di luar cakupan phase ini.
          </small>
        </div>
      </section>

      {/* D. Pemetaan Unit */}
      <section className="panel">
        <div className="panel-heading">
          <h2>Pemetaan Unit</h2>
          <Link2 size={18} />
        </div>
        <div className="empty">
          <Link2 size={26} />
          <h3>Belum ada pemetaan unit.</h3>
          <p>Unit vila yang dipetakan ke kamar Beds24 akan tampil di sini.</p>
        </div>
      </section>

      {/* E. Sinkronisasi */}
      <section className="panel">
        <div className="panel-heading">
          <h2>Sinkronisasi</h2>
          <RefreshCw size={18} />
        </div>
        <div className="empty">
          <p>Kontrol sinkronisasi akan tersedia setelah koneksi dan pemetaan siap.</p>
        </div>
      </section>

      {/* F. Last Sync Summary */}
      <section className="panel">
        <div className="panel-heading">
          <h2>Ringkasan Sinkronisasi Terakhir</h2>
        </div>
        <div className="empty">
          <p>Belum ada sinkronisasi. Ringkasan hasil akan muncul setelah sinkronisasi pertama.</p>
        </div>
      </section>

      {/* G. Attention Required */}
      <section className="panel attention">
        <div className="panel-heading">
          <h2>Perlu Perhatian</h2>
          <AlertTriangle size={18} />
        </div>
        <div className="empty">
          <p>Tidak ada masalah konektivitas yang memerlukan perhatian.</p>
        </div>
      </section>

      {/* H. Sync History */}
      <section className="panel">
        <div className="panel-heading">
          <h2>Riwayat Sinkronisasi</h2>
          <History size={18} />
        </div>
        <div className="empty">
          <p>Belum ada riwayat sinkronisasi.</p>
        </div>
      </section>

      {/* I. iCal Fallback */}
      <section className="panel">
        <div className="panel-heading">
          <h2>iCal — Fallback Calendar Connectivity</h2>
          <CalendarDays size={18} />
        </div>
        <div className="note">
          iCal hanya menyinkronkan blok tanggal kalender, bukan reservasi penuh.
          Sinkronisasi reservasi lengkap dari OTA ditangani oleh Beds24 channel manager di atas.
        </div>
      </section>
      <ChannelsPanel state={state} demo={demo} busy={busy} save={save} />
    </>
  );
}