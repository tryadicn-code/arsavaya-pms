/**
 * Pure helpers for integration DB reads.
 *
 * This module has NO runtime dependency (no cloudflare:workers, no D1).
 * It exists so that Node-based tests can verify:
 *   - limit normalization
 *   - row → safe summary mapping
 *   - metadata whitelisting
 *   - exclusion of internal fields
 *
 * Provider-neutral by design. Beds24 is the first provider but these
 * helpers must remain usable for any future provider.
 */

// ---------- limits ----------

export const HISTORY_DEFAULT_LIMIT = 30;
export const HISTORY_MAX_LIMIT = 100;

export const ISSUES_DEFAULT_LIMIT = 50;
export const ISSUES_MAX_LIMIT = 200;

const ABSOLUTE_MIN_LIMIT = 1;

/**
 * Normalize a user-supplied limit:
 *   - non-finite / undefined / null → default
 *   - < MIN → MIN
 *   - > MAX → MAX
 *   - otherwise → floor(value)
 */
export function normalizeLimit(
  raw: unknown,
  defaultValue: number,
  maxValue: number,
): number {
  if (raw === undefined || raw === null) return defaultValue;
  const n = Number(raw);
  if (!Number.isFinite(n)) return defaultValue;
  const floored = Math.floor(n);
  if (floored < ABSOLUTE_MIN_LIMIT) return ABSOLUTE_MIN_LIMIT;
  if (floored > maxValue) return maxValue;
  return floored;
}

// ---------- sync run summary ----------

export type SyncRunSummary = {
  id: string;
  provider: string;
  syncType: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  receivedCount: number;
  createdCount: number;
  updatedCount: number;
  cancelledCount: number;
  conflictCount: number;
  errorCount: number;
  lastError: string | null;
};

/**
 * Map a D1 sync_runs row to the safe UI-facing summary.
 *
 * Deliberately EXCLUDES:
 *   - cursor_before / cursor_after (developer-level)
 *   - account_id (workspace/internal)
 *   - workspace (server-derived)
 *   - needsReviewCount (not persisted in schema — model-only)
 */
export function mapSyncRunRowToSummary(row: Record<string, unknown>): SyncRunSummary {
  return {
    id: String(row.id ?? ''),
    provider: String(row.provider ?? ''),
    syncType: String(row.sync_type ?? ''),
    status: String(row.status ?? ''),
    startedAt: String(row.started_at ?? ''),
    finishedAt: row.finished_at == null ? null : String(row.finished_at),
    receivedCount: Number(row.received_count ?? 0),
    createdCount: Number(row.created_count ?? 0),
    updatedCount: Number(row.updated_count ?? 0),
    cancelledCount: Number(row.cancelled_count ?? 0),
    conflictCount: Number(row.conflict_count ?? 0),
    errorCount: Number(row.error_count ?? 0),
    lastError: row.last_error == null ? null : String(row.last_error),
  };
}

// ---------- integration issue summary ----------

export type IntegrationIssueSummary = {
  id: string;
  provider: string;
  eventType: string;
  externalId: string;
  reconciliationStatus: string;
  localEntityId: string | null;
  metadata: Record<string, unknown> | null;
  reason: string | null;
  receivedAt: string;
  processedAt: string | null;
};

/**
 * Whitelist of metadata keys safe for operator UI.
 * Anything else (guest PII, price, notes, provider blobs) is dropped.
 */
const SAFE_METADATA_KEYS = new Set([
  'arrival',
  'departure',
  'externalUnitId',
  'channel',
]);

function safeMetadata(raw: unknown): Record<string, unknown> | null {
  if (typeof raw !== 'string' || raw.length === 0) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
    if (SAFE_METADATA_KEYS.has(k)) out[k] = v;
  }
  return Object.keys(out).length > 0 ? out : null;
}

/**
 * Map a D1 integration_events row to the safe UI-facing issue summary.
 *
 * Deliberately EXCLUDES:
 *   - dedupe_key (internal idempotency)
 *   - entity_key (internal identity)
 *   - external_updated_at (developer-level)
 *   - account_id / workspace (server-derived)
 *   - raw provider payloads
 *   - guest PII beyond what is already in metadata whitelist
 */
export function mapEventRowToIssueSummary(
  row: Record<string, unknown>,
): IntegrationIssueSummary {
  return {
    id: String(row.id ?? ''),
    provider: String(row.provider ?? ''),
    eventType: String(row.event_type ?? ''),
    externalId: String(row.external_id ?? ''),
    reconciliationStatus: String(row.reconciliation_status ?? ''),
    localEntityId:
      row.local_entity_id == null ? null : String(row.local_entity_id),
    metadata: safeMetadata(row.metadata),
    reason: row.error == null ? null : String(row.error),
    receivedAt: String(row.received_at ?? ''),
    processedAt: row.processed_at == null ? null : String(row.processed_at),
  };
}