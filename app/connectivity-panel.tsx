'use client';
import { useState, useEffect, useRef } from 'react';
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
  ChevronRight,
  Play,
  CircleAlert,
} from 'lucide-react';
import type { State } from '../lib/pms';
import ChannelsPanel from './channels-panel';
import {
  mapBeds24Status,
  mapBeds24Error,
  extractSafeStatusFields,
  extractSafeProperties,
  extractSafeMappings,
  buildPropertyHierarchy,
  buildMappingViewModel,
  suggestMapping,
  mapMappingSaveError,
  mapSyncRunStatus,
  extractSafeSyncHistory,
  extractSyncResult,
  extractSafeIssues,
  deriveNextSyncMode,
  formatDuration,
  buildSyncFeedback,
  CAPABILITIES_SUPPORTED,
  CAPABILITIES_NOT_SUPPORTED,
  PROVIDER_DISPLAY_NAME,
  PROVIDER_TYPE_LABEL,
  PROVIDER_MODE_LABEL,
  PROVIDER_READONLY_LABEL,
  type Beds24StatusViewModel,
  type SafeProperty,
  type SafeRoom,
  type SafeMapping,
  type PropertyHierarchy,
  type UnitMappingViewModel,
  type SafeSyncRun,
  type SafeIssue,
} from './connectivity-helpers';

const HISTORY_LIMIT = 20;
const ISSUES_LIMIT = 50;

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });
}

function statusBadge(s: UnitMappingViewModel['status']): { label: string; tone: string } {
  if (s === 'MAPPED') return { label: 'Terpetakan', tone: 'green' };
  if (s === 'NEEDS_ATTENTION') return { label: 'Perlu perhatian', tone: 'amber' };
  return { label: 'Belum dipetakan', tone: 'muted' };
}

type MappingFormState = {
  localUnitId: string;
  externalPropertyId: string;
  externalUnitId: string;
};

type Feedback = { kind: 'success' | 'warning' | 'error'; message: string } | null;

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
  // ---------- Status ----------
  const [status, setStatus] = useState<Beds24StatusViewModel | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState('');
  const [testing, setTesting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [statusTick, setStatusTick] = useState(0);

  // ---------- Inventory + Mappings ----------
  const [properties, setProperties] = useState<SafeProperty[]>([]);
  const [rooms, setRooms] = useState<SafeRoom[]>([]);
  const [mappings, setMappings] = useState<SafeMapping[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [inventoryError, setInventoryError] = useState('');
  const [inventoryTick, setInventoryTick] = useState(0);
  const [mappingForm, setMappingForm] = useState<MappingFormState | null>(null);
  const [savingMapping, setSavingMapping] = useState(false);
  const [mappingFeedback, setMappingFeedback] = useState<Feedback>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // ---------- Sync + History + Issues ----------
  const [historyRuns, setHistoryRuns] = useState<SafeSyncRun[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');
  const [issues, setIssues] = useState<{ needsReview: SafeIssue[]; conflict: SafeIssue[] }>({
    needsReview: [],
    conflict: [],
  });
  const [issuesLoading, setIssuesLoading] = useState(true);
  const [issuesError, setIssuesError] = useState('');
  const [syncRunning, setSyncRunning] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<Feedback>(null);
  const [confirmInitial, setConfirmInitial] = useState(false);
  const [syncTick, setSyncTick] = useState(0);

  // ---------- Effects ----------

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
  }, [statusTick]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setInventoryLoading(true);
      try {
        const [pRes, mRes] = await Promise.all([
          fetch('/api/integrations/beds24', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'properties' }),
          }),
          fetch('/api/integrations/beds24', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'mappings' }),
          }),
        ]);
        const pJson = (await pRes.json()) as Record<string, unknown>;
        const mJson = (await mRes.json()) as Record<string, unknown>;
        if (cancelled) return;
        if (!pRes.ok) {
          const msg = typeof pJson.error === 'string' ? pJson.error : 'Inventori tidak dapat dimuat';
          throw new Error(msg);
        }
        const safe = extractSafeProperties(pJson);
        setProperties(safe.properties);
        setRooms(safe.rooms);
        setMappings(extractSafeMappings(mJson));
        setInventoryError('');
      } catch (e) {
        if (cancelled) return;
        setInventoryError(mapBeds24Error(e));
      } finally {
        if (!cancelled) setInventoryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [inventoryTick]);

  useEffect(() => {
    if (!mappingForm) return;
    const t = setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
    return () => clearTimeout(t);
  }, [mappingForm]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setHistoryLoading(true);
      try {
        const r = await fetch('/api/integrations/beds24', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'history', payload: { limit: HISTORY_LIMIT } }),
        });
        const j = (await r.json()) as Record<string, unknown>;
        if (cancelled) return;
        if (!r.ok) {
          const msg = typeof j.error === 'string' ? j.error : 'Riwayat tidak dapat dimuat';
          throw new Error(msg);
        }
        setHistoryRuns(extractSafeSyncHistory(j));
        setHistoryError('');
      } catch (e) {
        if (cancelled) return;
        setHistoryError(mapBeds24Error(e));
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [syncTick]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIssuesLoading(true);
      try {
        const r = await fetch('/api/integrations/beds24', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'issues', payload: { limit: ISSUES_LIMIT } }),
        });
        const j = (await r.json()) as Record<string, unknown>;
        if (cancelled) return;
        if (!r.ok) {
          const msg = typeof j.error === 'string' ? j.error : 'Daftar perhatian tidak dapat dimuat';
          throw new Error(msg);
        }
        setIssues(extractSafeIssues(j));
        setIssuesError('');
      } catch (e) {
        if (cancelled) return;
        setIssuesError(mapBeds24Error(e));
      } finally {
        if (!cancelled) setIssuesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [syncTick]);

  // ---------- Handlers ----------

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
      setStatusTick((t) => t + 1);
    } catch (e) {
      setFeedback({ kind: 'error', message: mapBeds24Error(e) });
    } finally {
      setTesting(false);
    }
  };

  const onRefreshProperties = () => {
    setMappingFeedback(null);
    setInventoryTick((t) => t + 1);
  };

  const openMappingForm = (localUnitId: string) => {
    const existing = mappings.find((m) => m.localUnitId === localUnitId && m.confirmed);
    setMappingForm({
      localUnitId,
      externalPropertyId: existing?.externalPropertyId ?? '',
      externalUnitId: existing?.externalUnitId ?? '',
    });
    setMappingFeedback(null);
  };

  const closeMappingForm = () => {
    setMappingForm(null);
    setMappingFeedback(null);
  };

  const onSaveMapping = async () => {
    if (!mappingForm || savingMapping) return;
    if (!mappingForm.externalPropertyId || !mappingForm.externalUnitId) {
      setMappingFeedback({
        kind: 'error',
        message: 'Pilih properti dan kamar Beds24 terlebih dahulu.',
      });
      return;
    }
    setSavingMapping(true);
    setMappingFeedback(null);
    try {
      const r = await fetch('/api/integrations/beds24', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mapping-save',
          payload: {
            localUnitId: mappingForm.localUnitId,
            externalPropertyId: mappingForm.externalPropertyId,
            externalUnitId: mappingForm.externalUnitId,
          },
        }),
      });
      const j = (await r.json()) as Record<string, unknown>;
      if (r.ok && j.ok === true) {
        const unchanged = j.unchanged === true;
        setMappingFeedback({
          kind: 'success',
          message: unchanged ? 'Pemetaan sudah sesuai.' : 'Pemetaan berhasil disimpan.',
        });
        setInventoryTick((t) => t + 1);
      } else {
        const rawMsg = typeof j.error === 'string' ? j.error : 'Gagal menyimpan pemetaan.';
        const mapped = mapMappingSaveError(rawMsg);
        setMappingFeedback({ kind: 'error', message: mapped.message });
      }
    } catch (e) {
      setMappingFeedback({ kind: 'error', message: mapBeds24Error(e) });
    } finally {
      setSavingMapping(false);
    }
  };

  const nextMode = deriveNextSyncMode(historyRuns);

  const runSync = async (mode: 'initial' | 'incremental') => {
    if (syncRunning) return;
    setSyncRunning(true);
    setSyncFeedback(null);
    try {
      const r = await fetch('/api/integrations/beds24', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync', payload: { mode } }),
      });
      const j = (await r.json()) as Record<string, unknown>;
      if (!r.ok) {
        setSyncFeedback({
          kind: 'error',
          message: 'Sinkronisasi gagal. Periksa status koneksi dan coba kembali.',
        });
      } else {
        const result = extractSyncResult(j);
        if (result) {
          const fb = buildSyncFeedback(result.run);
          setSyncFeedback({
            kind: fb.kind,
            message: fb.summary ? `${fb.title} (${fb.summary})` : fb.title,
          });
        } else {
          setSyncFeedback({ kind: 'success', message: 'Sinkronisasi selesai.' });
        }
      }
      setSyncTick((t) => t + 1);
      setStatusTick((t) => t + 1);
    } catch {
      setSyncFeedback({
        kind: 'error',
        message: 'Sinkronisasi gagal. Periksa status koneksi dan coba kembali.',
      });
    } finally {
      setSyncRunning(false);
    }
  };

  const onClickSyncPrimary = () => {
    if (syncRunning) return;
    if (nextMode === 'initial') {
      setConfirmInitial(true);
    } else {
      void runSync('incremental');
    }
  };

  const onConfirmInitial = () => {
    setConfirmInitial(false);
    void runSync('initial');
  };

  const onRefreshAll = () => {
    setSyncFeedback(null);
    setStatusTick((t) => t + 1);
    setInventoryTick((t) => t + 1);
    setSyncTick((t) => t + 1);
  };

  const hierarchy: PropertyHierarchy[] = buildPropertyHierarchy(properties, rooms);
  const localUnits = state.units.map((u) => ({ id: u.id, name: u.name }));
  const mappingVM: UnitMappingViewModel[] = buildMappingViewModel(localUnits, hierarchy, mappings);
  const view = status ? mapBeds24Status(status.health) : null;
  const noInventory = !inventoryLoading && !inventoryError && properties.length === 0;

  const latestRun = historyRuns.length > 0 ? historyRuns[0] : null;
  const latestBadge = latestRun ? mapSyncRunStatus(latestRun.status) : null;

  return (
    <>
      <style>{`
        .history-desktop { display: block; }
        .history-mobile { display: none; }
        .mapping-desktop { display: block; }
        .mapping-mobile { display: none; }
        @media (max-width: 768px) {
          .mapping-desktop { display: none; }
          .mapping-mobile { display: block; }
          .history-desktop { display: none; }
          .history-mobile { display: block; }
        }
        .issue-cell-safe {
          word-break: break-word;
          overflow-wrap: anywhere;
          white-space: normal;
        }
      `}</style>

      {/* B. Provider Overview */}
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

      {/* C. Status Koneksi */}
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
            <button className="secondary" onClick={() => setStatusTick((t) => t + 1)}>
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
                <strong>{status.configured ? 'Terkonfigurasi' : 'Belum dikonfigurasi'}</strong>
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

      {/* C2. Kapabilitas */}
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
          <div className="inline">
            <button
              className="secondary"
              disabled={inventoryLoading || savingMapping}
              onClick={onRefreshProperties}
            >
              <RefreshCw size={15} />
              {inventoryLoading ? 'Memuat…' : 'Refresh Properties'}
            </button>
            <Link2 size={18} />
          </div>
        </div>

        {inventoryLoading && (
          <div className="empty">
            <RefreshCw size={22} />
            <p>Memuat inventori Beds24…</p>
          </div>
        )}

        {!inventoryLoading && inventoryError && (
          <div className="empty">
            <AlertTriangle size={22} />
            <p>{inventoryError}</p>
            <button className="secondary" onClick={onRefreshProperties}>
              Coba lagi
            </button>
          </div>
        )}

        {noInventory && (
          <div className="empty">
            <Link2 size={26} />
            <h3>Belum ada properti Beds24 yang tersedia.</h3>
            <p>Pastikan koneksi Beds24 aktif, lalu tekan Refresh Properties.</p>
          </div>
        )}

        {!inventoryLoading && !inventoryError && properties.length > 0 && (
          <>
            <div className="table-wrap mapping-desktop">
              <table>
                <thead>
                  <tr>
                    <th>Unit vila</th>
                    <th>Pemetaan Beds24</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {mappingVM.map((vm) => {
                    const badge = statusBadge(vm.status);
                    return (
                      <tr key={vm.localUnitId}>
                        <td>
                          <strong>{vm.localUnitName}</strong>
                          <small>{vm.localUnitId}</small>
                        </td>
                        <td>
                          {vm.mapping ? (
                            <>
                              <strong>{vm.mapping.roomName}</strong>
                              <small>
                                {vm.mapping.propertyName} · {vm.mapping.externalPropertyId}/
                                {vm.mapping.externalUnitId}
                              </small>
                            </>
                          ) : (
                            <span className="text-muted">Belum dipetakan</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${badge.tone}`}>{badge.label}</span>
                          {vm.reason && (
                            <small style={{ display: 'block', marginTop: 4 }}>
                              {vm.reason}
                            </small>
                          )}
                        </td>
                        <td>
                          <button
                            className="text-btn"
                            disabled={savingMapping}
                            onClick={() => openMappingForm(vm.localUnitId)}
                          >
                            {vm.mapping ? 'Ubah' : 'Petakan'}
                            <ChevronRight size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mapping-mobile">
              {mappingVM.map((vm) => {
                const badge = statusBadge(vm.status);
                return (
                  <div
                    key={vm.localUnitId}
                    className="panel"
                    style={{ marginBottom: 10, padding: 12 }}
                  >
                    <div className="between">
                      <div>
                        <strong>{vm.localUnitName}</strong>
                        <small style={{ display: 'block', marginTop: 2 }}>
                          {vm.localUnitId}
                        </small>
                      </div>
                      <span className={`badge ${badge.tone}`}>{badge.label}</span>
                    </div>

                    <div style={{ marginTop: 10 }}>
                      {vm.mapping ? (
                        <>
                          <div
                            style={{
                              wordBreak: 'break-word',
                              overflowWrap: 'anywhere',
                            }}
                          >
                            <strong>{vm.mapping.roomName}</strong>
                          </div>
                          <small
                            style={{
                              display: 'block',
                              marginTop: 2,
                              wordBreak: 'break-word',
                              overflowWrap: 'anywhere',
                            }}
                          >
                            {vm.mapping.propertyName}
                          </small>
                          <small style={{ display: 'block', marginTop: 2 }}>
                            {vm.mapping.externalPropertyId}/{vm.mapping.externalUnitId}
                          </small>
                        </>
                      ) : (
                        <span className="text-muted">Belum dipetakan</span>
                      )}
                    </div>

                    {vm.reason && (
                      <small
                        style={{
                          display: 'block',
                          marginTop: 8,
                          wordBreak: 'break-word',
                        }}
                      >
                        {vm.reason}
                      </small>
                    )}

                    <div className="button-row" style={{ marginTop: 10 }}>
                      <button
                        className="secondary"
                        disabled={savingMapping}
                        onClick={() => openMappingForm(vm.localUnitId)}
                      >
                        {vm.mapping ? 'Ubah' : 'Petakan'}
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {mappingForm && (
              <div
                ref={formRef}
                style={{
                  marginTop: 16,
                  padding: 16,
                  border: '2px solid #0f766e',
                  borderRadius: 8,
                  background: '#f0fdfa',
                  scrollMarginTop: 80,
                }}
              >
                <MappingFormInline
                  form={mappingForm}
                  setForm={setMappingForm}
                  hierarchy={hierarchy}
                  localUnits={localUnits}
                  saving={savingMapping}
                  onSave={onSaveMapping}
                  onCancel={closeMappingForm}
                  feedback={mappingFeedback}
                />
              </div>
            )}

            {!mappingForm && mappingFeedback && (
              <p
                className={mappingFeedback.kind === 'success' ? 'note' : 'error'}
                role={mappingFeedback.kind === 'success' ? 'status' : 'alert'}
              >
                {mappingFeedback.kind === 'success' ? <Check size={14} /> : <AlertTriangle size={14} />}{' '}
                {mappingFeedback.message}
              </p>
            )}
          </>
        )}
      </section>

      {/* E. Sinkronisasi */}
      <section className="panel">
        <div className="panel-heading">
          <h2>Sinkronisasi</h2>
          <div className="inline">
            <button
              className="secondary"
              disabled={historyLoading || issuesLoading || syncRunning}
              onClick={onRefreshAll}
              aria-label="Muat ulang data sinkronisasi"
            >
              <RefreshCw size={15} />
            </button>
            <Play size={18} />
          </div>
        </div>

        <div className="note">
          {nextMode === 'initial'
            ? 'Menarik reservasi aktif dari Beds24 untuk membentuk kondisi awal ARSAVAYA.'
            : 'Memeriksa perubahan reservasi terbaru dari Beds24.'}
        </div>

        <div className="button-row">
          <button className="primary" disabled={syncRunning} onClick={onClickSyncPrimary}>
            <Play size={16} />
            {syncRunning
              ? 'Menyinkronkan…'
              : nextMode === 'initial'
                ? 'Jalankan Sinkronisasi Awal'
                : 'Sinkronkan Sekarang'}
          </button>
        </div>

        {syncRunning && (
          <p className="note">ARSAVAYA sedang memeriksa reservasi dari Beds24.</p>
        )}

        {syncFeedback && (
          <p
            className={
              syncFeedback.kind === 'success'
                ? 'note'
                : syncFeedback.kind === 'warning'
                  ? 'note'
                  : 'error'
            }
            role={syncFeedback.kind === 'error' ? 'alert' : 'status'}
          >
            {syncFeedback.kind === 'success' ? (
              <Check size={14} />
            ) : (
              <AlertTriangle size={14} />
            )}{' '}
            {syncFeedback.message}
          </p>
        )}
      </section>

      {/* F. Last Sync Summary */}
      <section className="panel">
        <div className="panel-heading">
          <h2>Ringkasan Sinkronisasi Terakhir</h2>
        </div>

        {historyLoading && (
          <div className="empty">
            <RefreshCw size={22} />
            <p>Memuat ringkasan…</p>
          </div>
        )}

        {!historyLoading && historyError && (
          <div className="empty">
            <AlertTriangle size={22} />
            <p>{historyError}</p>
          </div>
        )}

        {!historyLoading && !historyError && !latestRun && (
          <div className="empty">
            <p>Belum ada sinkronisasi. Ringkasan hasil akan muncul setelah sinkronisasi pertama.</p>
          </div>
        )}

        {!historyLoading && !historyError && latestRun && latestBadge && (
          <>
            <div className="detail-grid">
              <div>
                <small>STATUS</small>
                <span className={`badge ${latestBadge.tone}`}>{latestBadge.label}</span>
              </div>
              <div>
                <small>WAKTU</small>
                <strong>{formatTime(latestRun.startedAt)}</strong>
              </div>
              <div>
                <small>DURASI</small>
                <strong>{formatDuration(latestRun.startedAt, latestRun.finishedAt)}</strong>
              </div>
              <div>
                <small>DITERIMA</small>
                <strong>{latestRun.receivedCount}</strong>
              </div>
              <div>
                <small>DIBUAT</small>
                <strong>{latestRun.createdCount}</strong>
              </div>
              <div>
                <small>DIPERBARUI</small>
                <strong>{latestRun.updatedCount}</strong>
              </div>
              <div>
                <small>DIBATALKAN</small>
                <strong>{latestRun.cancelledCount}</strong>
              </div>
              <div>
                <small>KONFLIK</small>
                <strong>{latestRun.conflictCount}</strong>
              </div>
              {latestRun.needsReviewCount !== null && (
                <div>
                  <small>PERLU DIPERIKSA</small>
                  <strong>{latestRun.needsReviewCount}</strong>
                </div>
              )}
              <div>
                <small>ERROR</small>
                <strong>{latestRun.errorCount}</strong>
              </div>
            </div>
            {latestRun.lastError && (
              <div className="error" role="alert">
                {latestRun.lastError}
              </div>
            )}
          </>
        )}
      </section>

      {/* G. Perlu Perhatian */}
      <section className="panel attention">
        <div className="panel-heading">
          <h2>Perlu Perhatian</h2>
          <AlertTriangle size={18} />
        </div>

        {issuesLoading && (
          <div className="empty">
            <RefreshCw size={22} />
            <p>Memuat daftar perhatian…</p>
          </div>
        )}

        {!issuesLoading && issuesError && (
          <div className="empty">
            <AlertTriangle size={22} />
            <p>{issuesError}</p>
          </div>
        )}

        {!issuesLoading && !issuesError && (
          <>
            <h3 style={{ marginTop: 8 }}>Perlu Diperiksa</h3>
            {issues.needsReview.length === 0 ? (
              <p className="text-muted">Tidak ada item yang perlu diperiksa.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Reservasi eksternal</th>
                      <th>Tanggal</th>
                      <th>Sumber</th>
                      <th>Alasan</th>
                      <th>Diterima</th>
                    </tr>
                  </thead>
                  <tbody>
                    {issues.needsReview.map((issue) => (
                      <IssueRow key={issue.id} issue={issue} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <h3 style={{ marginTop: 16 }}>Konflik</h3>
            {issues.conflict.length === 0 ? (
              <p className="text-muted">Tidak ada konflik terdeteksi.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Reservasi eksternal</th>
                      <th>Tanggal</th>
                      <th>Sumber</th>
                      <th>Alasan</th>
                      <th>Diterima</th>
                    </tr>
                  </thead>
                  <tbody>
                    {issues.conflict.map((issue) => (
                      <IssueRow key={issue.id} issue={issue} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>

      {/* H. Sync History */}
      <section className="panel">
        <div className="panel-heading">
          <h2>Riwayat Sinkronisasi</h2>
          <History size={18} />
        </div>

        {historyLoading && (
          <div className="empty">
            <RefreshCw size={22} />
            <p>Memuat riwayat…</p>
          </div>
        )}

        {!historyLoading && historyError && (
          <div className="empty">
            <AlertTriangle size={22} />
            <p>{historyError}</p>
          </div>
        )}

        {!historyLoading && !historyError && historyRuns.length === 0 && (
          <div className="empty">
            <p>Belum ada riwayat sinkronisasi.</p>
          </div>
        )}

        {!historyLoading && !historyError && historyRuns.length > 0 && (
          <>
            <div className="table-wrap history-desktop">
              <table>
                <thead>
                  <tr>
                    <th>Waktu</th>
                    <th>Status</th>
                    <th>Diterima</th>
                    <th>Dibuat</th>
                    <th>Diperbarui</th>
                    <th>Dibatalkan</th>
                    <th>Konflik</th>
                    <th>Error</th>
                  </tr>
                </thead>
                <tbody>
                  {historyRuns.map((run) => {
                    const badge = mapSyncRunStatus(run.status);
                    return (
                      <tr key={run.id}>
                        <td>
                          <strong>{formatTime(run.startedAt)}</strong>
                          <small>{formatDuration(run.startedAt, run.finishedAt)}</small>
                        </td>
                        <td>
                          <span className={`badge ${badge.tone}`}>{badge.label}</span>
                        </td>
                        <td>{run.receivedCount}</td>
                        <td>{run.createdCount}</td>
                        <td>{run.updatedCount}</td>
                        <td>{run.cancelledCount}</td>
                        <td>{run.conflictCount}</td>
                        <td>{run.errorCount}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="history-mobile">
              {historyRuns.map((run) => {
                const badge = mapSyncRunStatus(run.status);
                return (
                  <div
                    key={run.id}
                    className="panel"
                    style={{ marginBottom: 10, padding: 12 }}
                  >
                    <div className="between">
                      <div>
                        <strong>{formatTime(run.startedAt)}</strong>
                        <small style={{ display: 'block', marginTop: 2 }}>
                          {formatDuration(run.startedAt, run.finishedAt)}
                        </small>
                      </div>
                      <span className={`badge ${badge.tone}`}>{badge.label}</span>
                    </div>
                    <div className="detail-grid" style={{ marginTop: 12 }}>
                      <div>
                        <small>DITERIMA</small>
                        <strong>{run.receivedCount}</strong>
                      </div>
                      <div>
                        <small>DIBUAT</small>
                        <strong>{run.createdCount}</strong>
                      </div>
                      <div>
                        <small>DIPERBARUI</small>
                        <strong>{run.updatedCount}</strong>
                      </div>
                      <div>
                        <small>DIBATALKAN</small>
                        <strong>{run.cancelledCount}</strong>
                      </div>
                      <div>
                        <small>KONFLIK</small>
                        <strong>{run.conflictCount}</strong>
                      </div>
                      <div>
                        <small>ERROR</small>
                        <strong>{run.errorCount}</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
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

      {/* Initial Sync Confirmation Modal */}
      {confirmInitial && (
        <div className="overlay" onMouseDown={(e) => {
          if (e.target === e.currentTarget && !syncRunning) setConfirmInitial(false);
        }}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="confirm-initial-title">
            <div className="modal-header">
              <h2 id="confirm-initial-title">Jalankan sinkronisasi awal?</h2>
            </div>
            <div className="modal-body">
              <p className="note">
                ARSAVAYA akan menarik data reservasi dari Beds24 berdasarkan pemetaan unit
                yang telah dikonfirmasi. Proses ini tidak menulis atau mengubah data di Beds24.
              </p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="secondary"
                disabled={syncRunning}
                onClick={() => setConfirmInitial(false)}
              >
                Batal
              </button>
              <button
                type="button"
                className="primary"
                disabled={syncRunning}
                onClick={onConfirmInitial}
              >
                Jalankan Sinkronisasi
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

// =====================================================================
// Sub-components
// =====================================================================

function IssueRow({ issue }: { issue: SafeIssue }) {
  const dates =
    issue.metadata?.arrival && issue.metadata?.departure
      ? `${issue.metadata.arrival} → ${issue.metadata.departure}`
      : '—';
  const channel = issue.metadata?.channel ?? '—';
  const receivedAt = issue.receivedAt ? formatTime(issue.receivedAt) : '—';
  return (
    <tr>
      <td className="issue-cell-safe">
        <strong>{issue.externalId || '—'}</strong>
        <small>{issue.eventType || '—'}</small>
      </td>
      <td className="issue-cell-safe">{dates}</td>
      <td className="issue-cell-safe">{channel}</td>
      <td className="issue-cell-safe">
        <span className="inline">
          <CircleAlert size={13} />
          {issue.reason || '—'}
        </span>
      </td>
      <td className="issue-cell-safe">
        <small>{receivedAt}</small>
      </td>
    </tr>
  );
}

function MappingFormInline({
  form,
  setForm,
  hierarchy,
  localUnits,
  saving,
  onSave,
  onCancel,
  feedback,
}: {
  form: MappingFormState;
  setForm: (f: MappingFormState | null) => void;
  hierarchy: PropertyHierarchy[];
  localUnits: { id: string; name: string }[];
  saving: boolean;
  onSave: () => Promise<void>;
  onCancel: () => void;
  feedback: Feedback;
}) {
  const selectedProperty = hierarchy.find((p) => p.externalId === form.externalPropertyId);
  const selectedLocalUnit = localUnits.find((u) => u.id === form.localUnitId);
  const suggestion = selectedLocalUnit ? suggestMapping(selectedLocalUnit, hierarchy) : null;

  const setProperty = (id: string) => {
    setForm({ ...form, externalPropertyId: id, externalUnitId: '' });
  };
  const setRoom = (id: string) => {
    setForm({ ...form, externalUnitId: id });
  };

  const applySuggestion = () => {
    if (!suggestion) return;
    setForm({
      ...form,
      externalPropertyId: suggestion.externalPropertyId,
      externalUnitId: suggestion.externalUnitId,
    });
  };

  return (
    <div className="settings-form">
      <div className="panel-heading">
        <h2>{selectedLocalUnit ? `Petakan ${selectedLocalUnit.name}` : 'Petakan unit'}</h2>
        <button className="text-btn" onClick={onCancel} disabled={saving}>
          Tutup
        </button>
      </div>

      <div className="form-grid">
        <label className="field">
          <span>Unit vila</span>
          <select
            value={form.localUnitId}
            onChange={(e) => setForm({ ...form, localUnitId: e.target.value })}
            disabled={saving}
          >
            {localUnits.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.id})
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Properti Beds24</span>
          <select
            value={form.externalPropertyId}
            onChange={(e) => setProperty(e.target.value)}
            disabled={saving}
          >
            <option value="">— Pilih properti —</option>
            {hierarchy.map((p) => (
              <option key={p.externalId} value={p.externalId}>
                {p.name} ({p.externalId})
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Kamar Beds24</span>
          <select
            value={form.externalUnitId}
            onChange={(e) => setRoom(e.target.value)}
            disabled={saving || !selectedProperty}
          >
            <option value="">— Pilih kamar —</option>
            {(selectedProperty?.rooms ?? []).map((r) => (
              <option key={r.externalId} value={r.externalId}>
                {r.name} ({r.externalId})
              </option>
            ))}
          </select>
        </label>
      </div>

      {suggestion && (
        <div className="note">
          <Info size={14} /> Saran berdasarkan nama:{' '}
          <strong>
            {hierarchy.find((p) => p.externalId === suggestion.externalPropertyId)?.name} →{' '}
            {hierarchy
              .find((p) => p.externalId === suggestion.externalPropertyId)
              ?.rooms.find((r) => r.externalId === suggestion.externalUnitId)?.name}
          </strong>{' '}
          ({Math.round(suggestion.score * 100)}% cocok){' '}
          <button className="text-btn" onClick={applySuggestion} disabled={saving}>
            Terapkan
          </button>
        </div>
      )}

      <div className="button-row">
        <button className="primary" disabled={saving} onClick={onSave}>
          {saving ? 'Menyimpan…' : 'Konfirmasi Pemetaan'}
        </button>
        <button className="secondary" disabled={saving} onClick={onCancel}>
          Batal
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
    </div>
  );
}