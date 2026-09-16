'use client';
import {
  Network,
  ShieldCheck,
  Link2,
  RefreshCw,
  AlertTriangle,
  History,
  CalendarDays,
} from 'lucide-react';
import type { State } from '../lib/pms';
import ChannelsPanel from './channels-panel';

/**
 * Connectivity Panel — Sub-Phase B skeleton.
 *
 * Sections A–H are placeholders awaiting data binding in later sub-phases.
 * Section I temporarily embeds the existing ChannelsPanel (iCal fallback)
 * to keep iCal functionality reachable. This temporary composition will
 * be refactored in Sub-Phase F.
 */
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
  return (
    <>
      {/* B. Provider Overview */}
      <section className="panel">
        <div className="panel-heading">
          <h2>Channel Manager Provider</h2>
          <Network size={18} />
        </div>
        <div className="empty">
          <Network size={26} />
          <h3>Beds24</h3>
          <p>
            Channel Manager Provider · Inbound sync (read-only)
          </p>
          <small>Status koneksi akan ditampilkan di sini.</small>
        </div>
      </section>

      {/* C. Beds24 Status */}
      <section className="panel">
        <div className="panel-heading">
          <h2>Status Koneksi</h2>
          <ShieldCheck size={18} />
        </div>
        <div className="empty">
          <p>Informasi kredensial dan status koneksi akan ditampilkan di sini.</p>
        </div>
      </section>

      {/* D. Unit Mapping */}
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

      {/* E. Sync Controls */}
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

      {/* I. iCal Fallback — temporary composition until Sub-Phase F */}
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

      {/* Existing ChannelsPanel embedded temporarily.
          Do NOT duplicate or refactor in this sub-phase. */}
      <ChannelsPanel state={state} demo={demo} busy={busy} save={save} />
    </>
  );
}