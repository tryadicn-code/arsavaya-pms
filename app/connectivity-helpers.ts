/**
 * Pure helpers for Connectivity UI (Sub-Phase C).
 *
 * No React. No I/O. No secrets.
 * Safe to import from tests (--experimental-strip-types).
 */

// ---------- provider status ----------

export type ProviderStatus =
  | 'NOT_CONFIGURED'
  | 'CONFIGURED'
  | 'DISCONNECTED'
  | 'CONNECTED'
  | 'NEEDS_MAPPING'
  | 'READY'
  | 'SYNCING'
  | 'HEALTHY'
  | 'WARNING'
  | 'PARTIAL'
  | 'ERROR'
  | 'UNKNOWN';

export type ProviderTone = 'muted' | 'blue' | 'green' | 'amber' | 'red';

export type ProviderStatusView = {
  label: string;
  tone: ProviderTone;
};

export function mapBeds24Status(raw: string | null | undefined): ProviderStatusView {
  switch (raw) {
    case 'NOT_CONFIGURED':
      return { label: 'Belum dikonfigurasi', tone: 'muted' };
    case 'CONFIGURED':
      return { label: 'Terkonfigurasi', tone: 'muted' };
    case 'DISCONNECTED':
      return { label: 'Belum terhubung', tone: 'amber' };
    case 'CONNECTED':
      return { label: 'Terhubung', tone: 'blue' };
    case 'NEEDS_MAPPING':
      return { label: 'Terhubung · Perlu pemetaan', tone: 'amber' };
    case 'READY':
      return { label: 'Siap', tone: 'blue' };
    case 'SYNCING':
      return { label: 'Menyinkronkan', tone: 'blue' };
    case 'HEALTHY':
      return { label: 'Sehat', tone: 'green' };
    case 'WARNING':
    case 'PARTIAL':
      return { label: 'Perlu perhatian', tone: 'amber' };
    case 'ERROR':
      return { label: 'Gangguan koneksi', tone: 'red' };
    default:
      return { label: 'Status belum tersedia', tone: 'muted' };
  }
}

// ---------- error mapping ----------

export function mapBeds24Error(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? '');
  const l = raw.toLowerCase();
  if (l.includes('auth') || l.includes('401') || l.includes('403') || l.includes('token')) {
    return 'Kredensial Beds24 ditolak.';
  }
  if (l.includes('timeout') || l.includes('network') || l.includes('unreachable')) {
    return 'Beds24 tidak dapat dijangkau.';
  }
  if (l.includes('rate') || l.includes('429')) {
    return 'Batas API Beds24 sementara tercapai.';
  }
  if (l.includes('malformed') || l.includes('invalid')) {
    return 'Beds24 mengembalikan respons yang tidak sesuai.';
  }
  return 'Terjadi gangguan saat menghubungi Beds24.';
}

// ---------- safe field extraction ----------

export type Beds24ConnectionState = 'CONNECTED' | 'ERROR' | 'NOT_TESTED' | 'UNKNOWN';

export type Beds24StatusViewModel = {
  configured: boolean;
  health: ProviderStatus;
  connectionStatus: Beds24ConnectionState;
  lastSyncAt: string | null;
  lastError: string | null;
};

const KNOWN_HEALTH: ReadonlySet<ProviderStatus> = new Set([
  'NOT_CONFIGURED',
  'CONFIGURED',
  'DISCONNECTED',
  'CONNECTED',
  'NEEDS_MAPPING',
  'READY',
  'SYNCING',
  'HEALTHY',
  'WARNING',
  'PARTIAL',
  'ERROR',
  'UNKNOWN',
]);

/**
 * Whitelist-only extraction. Never passes through:
 *   - token / credentialSource / configJson
 *   - workspace / account_id
 *   - mapping / lastSyncRun (not needed for Sub-Phase C)
 *   - any unexpected field
 */
export function extractSafeStatusFields(raw: unknown): Beds24StatusViewModel {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const account = (
    obj.account && typeof obj.account === 'object' ? obj.account : null
  ) as Record<string, unknown> | null;

  const configured = obj.configured === true;
  const healthRaw = typeof obj.health === 'string' ? obj.health : 'UNKNOWN';
  const health = (
    KNOWN_HEALTH.has(healthRaw as ProviderStatus) ? healthRaw : 'UNKNOWN'
  ) as ProviderStatus;

  let connectionStatus: Beds24ConnectionState = 'NOT_TESTED';
  if (account) {
    const s = account.status;
    if (s === 'CONNECTED' || s === 'HEALTHY' || s === 'READY') connectionStatus = 'CONNECTED';
    else if (s === 'ERROR' || s === 'DISCONNECTED') connectionStatus = 'ERROR';
    else if (typeof s === 'string') connectionStatus = 'UNKNOWN';
  }

  return {
    configured,
    health,
    connectionStatus,
    lastSyncAt:
      account && typeof account.lastSyncAt === 'string' ? account.lastSyncAt : null,
    lastError:
      account && typeof account.lastError === 'string' ? account.lastError : null,
  };
}

// ---------- provider constants ----------

export const PROVIDER_DISPLAY_NAME = 'Beds24';
export const PROVIDER_TYPE_LABEL = 'Channel Manager Provider';
export const PROVIDER_MODE_LABEL = 'Inbound Sync';
export const PROVIDER_READONLY_LABEL = 'Read-only';

export const CAPABILITIES_SUPPORTED: readonly string[] = [
  'Properti',
  'Kamar',
  'Reservasi',
  'Modifikasi reservasi',
  'Pembatalan reservasi',
];

export const CAPABILITIES_NOT_SUPPORTED: readonly string[] = [
  'Tulis tarif',
  'Tulis ketersediaan',
  'Minimum stay write-back',
  'Pembuatan reservasi',
  'Konfigurasi OTA',
];