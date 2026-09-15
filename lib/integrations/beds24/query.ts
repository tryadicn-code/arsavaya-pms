/**
 * Beds24 booking query builder.
 *
 * FIX 3 — FALLBACK MODE SEMANTICS
 *
 * When USE_MODIFIED_FROM is false (current), the adapter does NOT send
 * `modifiedFrom`. The "incremental" sync is actually BOUNDED DATE-RANGE
 * POLLING — not true modified-time incremental synchronization.
 *
 * The cursor's lastModifiedAt is retained for FUTURE provider-version
 * tracking. It does NOT currently guarantee that all provider-side
 * changes are observed. Cancellations in particular require a separate
 * query with status=cancelled (see adapter.ts).
 *
 * Do NOT flip this to true until `modifiedFrom` is live-verified against
 * the official Beds24 Swagger.
 */
export const USE_MODIFIED_FROM = false;

export type BookingQuery = {
  id?: string;
  propertyId?: string;
  roomId?: string;
  arrivalFrom?: string;
  arrivalTo?: string;
  departureFrom?: string;
  departureTo?: string;
  status?: string[];
  modifiedFrom?: string;
  page?: number;
};

export type InitialSyncPolicy = {
  /** Days before today to include in initial sync. */
  pastDays: number;
  /** Days after today to include in initial sync. */
  futureDays: number;
};

export const DEFAULT_INITIAL_POLICY: InitialSyncPolicy = {
  pastDays: 30,
  futureDays: 365,
};

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(iso: string, n: number): string {
  const t = Date.parse(iso + 'T00:00:00Z');
  return new Date(t + n * 86400000).toISOString().slice(0, 10);
}

export function buildInitialSyncQuery(
  policy: InitialSyncPolicy = DEFAULT_INITIAL_POLICY,
): BookingQuery {
  const today = todayUtc();
  return {
    arrivalFrom: addDays(today, -policy.pastDays),
    arrivalTo: addDays(today, policy.futureDays),
  };
}

export function buildIncrementalSyncQuery(
  cursor: { lastModifiedAt?: string | null } | null,
): BookingQuery {
  if (!cursor?.lastModifiedAt) return buildInitialSyncQuery();
  if (USE_MODIFIED_FROM) return { modifiedFrom: cursor.lastModifiedAt };
  // Safe fallback: bounded date-range around now
  return buildInitialSyncQuery({ pastDays: 7, futureDays: 365 });
}

/**
 * Convert BookingQuery into URL query parameters for GET /bookings.
 * Beds24 uses comma-separated status lists per wiki examples.
 */
export function toUrlParams(q: BookingQuery): Record<string, string> {
  const out: Record<string, string> = {};
  if (q.id) out.id = q.id;
  if (q.propertyId) out.propertyId = q.propertyId;
  if (q.roomId) out.roomId = q.roomId;
  if (q.arrivalFrom) out.arrivalFrom = q.arrivalFrom;
  if (q.arrivalTo) out.arrivalTo = q.arrivalTo;
  if (q.departureFrom) out.departureFrom = q.departureFrom;
  if (q.departureTo) out.departureTo = q.departureTo;
  if (q.status && q.status.length) out.status = q.status.join(',');
  if (q.modifiedFrom) out.modifiedFrom = q.modifiedFrom;
  if (q.page) out.page = String(q.page);
  return out;
}