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


// =====================================================================
// Sub-Phase D — Property/Room Discovery + Unit Mapping
// =====================================================================

// ---------- safe inventory types ----------

export type SafeProperty = {
  externalId: string;
  name: string;
};

export type SafeRoom = {
  externalId: string;
  propertyExternalId: string;
  name: string;
};

export type SafeMapping = {
  localUnitId: string;
  externalPropertyId: string;
  externalUnitId: string;
  confirmed: boolean;
};

// ---------- whitelist extractors (raw API → safe types) ----------

export function extractSafeProperties(raw: unknown): {
  properties: SafeProperty[];
  rooms: SafeRoom[];
} {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const rawProps = Array.isArray(obj.properties) ? obj.properties : [];
  const rawUnits = Array.isArray(obj.units) ? obj.units : [];

  const properties: SafeProperty[] = [];
  for (const p of rawProps) {
    if (!p || typeof p !== 'object') continue;
    const r = p as Record<string, unknown>;
    if (typeof r.externalId !== 'string' || r.externalId.length === 0) continue;
    properties.push({
      externalId: r.externalId,
      name: typeof r.name === 'string' && r.name.length > 0 ? r.name : `Property ${r.externalId}`,
    });
  }

  const rooms: SafeRoom[] = [];
  for (const u of rawUnits) {
    if (!u || typeof u !== 'object') continue;
    const r = u as Record<string, unknown>;
    if (typeof r.externalId !== 'string' || r.externalId.length === 0) continue;
    if (typeof r.propertyExternalId !== 'string' || r.propertyExternalId.length === 0) continue;
    rooms.push({
      externalId: r.externalId,
      propertyExternalId: r.propertyExternalId,
      name: typeof r.name === 'string' && r.name.length > 0 ? r.name : `Room ${r.externalId}`,
    });
  }

  return { properties, rooms };
}

export function extractSafeMappings(raw: unknown): SafeMapping[] {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const arr = Array.isArray(obj.mappings) ? obj.mappings : [];
  const out: SafeMapping[] = [];
  for (const m of arr) {
    if (!m || typeof m !== 'object') continue;
    const r = m as Record<string, unknown>;
    if (typeof r.localUnitId !== 'string' || r.localUnitId.length === 0) continue;
    if (typeof r.externalPropertyId !== 'string' || r.externalPropertyId.length === 0) continue;
    if (typeof r.externalUnitId !== 'string' || r.externalUnitId.length === 0) continue;
    out.push({
      localUnitId: r.localUnitId,
      externalPropertyId: r.externalPropertyId,
      externalUnitId: r.externalUnitId,
      confirmed: r.confirmed === true || r.confirmed === 1,
    });
  }
  return out;
}

// ---------- property/room hierarchy ----------

export type PropertyHierarchy = {
  externalId: string;
  name: string;
  rooms: { externalId: string; name: string }[];
};

export function buildPropertyHierarchy(
  properties: readonly SafeProperty[],
  rooms: readonly SafeRoom[],
): PropertyHierarchy[] {
  const roomsByProperty = new Map<string, { externalId: string; name: string }[]>();
  for (const r of rooms) {
    const list = roomsByProperty.get(r.propertyExternalId) ?? [];
    list.push({ externalId: r.externalId, name: r.name });
    roomsByProperty.set(r.propertyExternalId, list);
  }
  return properties.map((p) => ({
    externalId: p.externalId,
    name: p.name,
    rooms: roomsByProperty.get(p.externalId) ?? [],
  }));
}

// ---------- mapping view model ----------

export type MappingStatus = 'MAPPED' | 'UNMAPPED' | 'NEEDS_ATTENTION';

export type UnitMappingViewModel = {
  localUnitId: string;
  localUnitName: string;
  status: MappingStatus;
  mapping: {
    externalPropertyId: string;
    externalUnitId: string;
    propertyName: string;
    roomName: string;
  } | null;
  /** Human-readable reason when status is NEEDS_ATTENTION. Null otherwise. */
  reason: string | null;
};

/**
 * Build per-local-unit mapping status.
 *
 * Identity is ALWAYS ID-based:
 *   localUnitId matches state.units[].id
 *   externalPropertyId matches Beds24 property ID
 *   externalUnitId matches Beds24 room ID
 *
 * Names are display-only.
 */
/**
 * Build per-local-unit mapping status.
 *
 * Identity is ALWAYS ID-based:
 *   localUnitId matches state.units[].id
 *   externalPropertyId matches Beds24 property ID
 *   externalUnitId matches Beds24 room ID
 *
 * Names are display-only.
 *
 * Behavior matrix:
 *   no mapping                                    → UNMAPPED
 *   mapping exists, confirmed === false           → NEEDS_ATTENTION ("Pemetaan belum dikonfirmasi.")
 *   mapping confirmed, property/room not in inv.  → NEEDS_ATTENTION ("Properti atau kamar...tidak ditemukan...")
 *   mapping confirmed, property/room in inventory → MAPPED
 */
export function buildMappingViewModel(
  localUnits: readonly { id: string; name: string }[],
  hierarchy: readonly PropertyHierarchy[],
  mappings: readonly SafeMapping[],
): UnitMappingViewModel[] {
  const propById = new Map(hierarchy.map((p) => [p.externalId, p]));

  // Keep latest mapping per local unit — do NOT filter by confirmed.
  const mappingByLocal = new Map<string, SafeMapping>();
  for (const m of mappings) {
    mappingByLocal.set(m.localUnitId, m);
  }

  return localUnits.map((u) => {
    const m = mappingByLocal.get(u.id);

    // ---- No mapping at all ----
    if (!m) {
      return {
        localUnitId: u.id,
        localUnitName: u.name,
        status: 'UNMAPPED',
        mapping: null,
        reason: null,
      };
    }

    const prop = propById.get(m.externalPropertyId);
    const room = prop?.rooms.find((r) => r.externalId === m.externalUnitId);

    // ---- Unconfirmed mapping → NEEDS_ATTENTION, do NOT auto-confirm ----
    if (!m.confirmed) {
      return {
        localUnitId: u.id,
        localUnitName: u.name,
        status: 'NEEDS_ATTENTION',
        mapping: {
          externalPropertyId: m.externalPropertyId,
          externalUnitId: m.externalUnitId,
          propertyName: prop?.name ?? '(tidak ditemukan di Beds24)',
          roomName: room?.name ?? '(tidak ditemukan di Beds24)',
        },
        reason: 'Pemetaan belum dikonfirmasi.',
      };
    }

    // ---- Confirmed but inventory missing ----
    if (!prop || !room) {
      return {
        localUnitId: u.id,
        localUnitName: u.name,
        status: 'NEEDS_ATTENTION',
        mapping: {
          externalPropertyId: m.externalPropertyId,
          externalUnitId: m.externalUnitId,
          propertyName: prop?.name ?? '(tidak ditemukan di Beds24)',
          roomName: room?.name ?? '(tidak ditemukan di Beds24)',
        },
        reason: 'Properti atau kamar Beds24 tidak ditemukan dalam inventori saat ini.',
      };
    }

    // ---- Happy path ----
    return {
      localUnitId: u.id,
      localUnitName: u.name,
      status: 'MAPPED',
      mapping: {
        externalPropertyId: m.externalPropertyId,
        externalUnitId: m.externalUnitId,
        propertyName: prop.name,
        roomName: room.name,
      },
      reason: null,
    };
  });
}

// ---------- suggestion (never auto-confirms) ----------

export type MappingSuggestion = {
  externalPropertyId: string;
  externalUnitId: string;
  score: number;
};

export function suggestMapping(
  localUnit: { id: string; name: string },
  hierarchy: readonly PropertyHierarchy[],
): MappingSuggestion | null {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const target = normalize(localUnit.name);
  if (!target) return null;

  let best: MappingSuggestion | null = null;
  for (const p of hierarchy) {
    for (const r of p.rooms) {
      const rn = normalize(r.name);
      if (!rn) continue;
      const score =
        rn === target ? 1 : rn.includes(target) || target.includes(rn) ? 0.7 : 0;
      if (score > 0 && (!best || score > best.score)) {
        best = {
          externalPropertyId: p.externalId,
          externalUnitId: r.externalId,
          score,
        };
      }
    }
  }
  return best;
}

// ---------- mapping save error mapping ----------

export type MappingSaveErrorKind =
  | 'conflict-external'
  | 'conflict-local'
  | 'validation'
  | 'unknown';

export function mapMappingSaveError(raw: string): {
  kind: MappingSaveErrorKind;
  message: string;
} {
  const original = (raw || '').trim();
  const l = original.toLowerCase();
  const safeEcho = sanitizeEcho(original);

  if (l.includes('external unit') && l.includes('unit lokal lain')) {
    return {
      kind: 'conflict-external',
      message: safeEcho || 'External unit sudah dipetakan ke unit lokal lain.',
    };
  }
  if (l.includes('unit lokal') && l.includes('external unit lain')) {
    return {
      kind: 'conflict-local',
      message: safeEcho || 'Unit lokal sudah dipetakan ke external unit lain.',
    };
  }
  if (l.includes('wajib') || l.includes('invalid') || l.includes('tidak valid')) {
    return {
      kind: 'validation',
      message: safeEcho || 'Data pemetaan tidak valid.',
    };
  }
  return {
    kind: 'unknown',
    message: safeEcho || 'Gagal menyimpan pemetaan.',
  };
}

/**
 * Strip messages that look like they may contain a credential / token
 * before echoing them to the UI.
 * Returns '' when unsafe → caller falls back to a fixed safe message.
 */
function sanitizeEcho(msg: string): string {
  if (!msg) return '';
  // env-var style assignment: KEY=value
  if (/[A-Z_][A-Z0-9_]{2,}\s*=\s*\S+/.test(msg)) return '';
  // credential/secret patterns with a value after separator
  if (/(token|secret|api[_-]?key|bearer|password)\s*[:=]/i.test(msg)) return '';
  return msg;
}