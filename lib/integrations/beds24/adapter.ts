/**
 * Beds24 ChannelManagerAdapter implementation. SERVER ONLY.
 *
 * FALLBACK POLLING MODE (USE_MODIFIED_FROM === false):
 *   - Bounded date-range query (arrivalFrom / arrivalTo)
 *   - PLUS the same bounded query with status=cancelled
 *   - Results merged and deduplicated by Beds24 booking id
 *   - Cancelled version wins on collision
 *
 * This is NOT true modified-time incremental sync. The cursor is
 * retained for future provider-version tracking, but does NOT
 * guarantee complete coverage in fallback mode.
 *
 * Tests may inject `tokenProvider` / `isConfiguredFn` to bypass
 * `cloudflare:workers` at import time.
 */
import { Beds24Client } from './client.ts';
import { mapBeds24Booking, mapBeds24Properties } from './mapper.ts';
import {
  buildInitialSyncQuery,
  buildIncrementalSyncQuery,
  toUrlParams,
} from './query.ts';
import { Beds24ListWrapper } from './types.ts';
import { capabilitySet } from '../capabilities.ts';
import type {
  AccountInfo,
  AdapterConfig,
  ChannelManagerAdapter,
  ConnectionHealth,
  ConnectionTestResult,
  SyncRequest,
  SyncResult,
} from '../adapter.ts';
import type {
  CanonicalProperty,
  CanonicalReservation,
  CanonicalUnit,
} from '../types.ts';

const PROVIDER = 'beds24';

export type Beds24AdapterDeps = {
  client?: Beds24Client;
  /** Test hook: bypass env-based token reading. */
  tokenProvider?: () => string;
  /** Test hook: bypass env-based configured check. */
  isConfiguredFn?: () => boolean;
  /** Test hook: fixed "now" for cursor timestamp. */
  nowFn?: () => string;
};

export type CursorShape = {
  v: 1;
  lastModifiedAt: string | null;
  syncedAt: string;
  mode: 'fallback-bounded-polling';
};

/**
 * Merge normal + cancelled raw booking arrays.
 *   - dedupe by Beds24 booking id
 *   - cancelled version wins on collision
 */
export function mergeRawBookings(
  normal: readonly unknown[],
  cancelled: readonly unknown[],
): unknown[] {
  const byId = new Map<string, unknown>();

  const getId = (b: unknown): string | null => {
    if (!b || typeof b !== 'object') return null;
    const id = (b as Record<string, unknown>).id;
    if (id === undefined || id === null) return null;
    return String(id);
  };
  const getStatus = (b: unknown): string => {
    if (!b || typeof b !== 'object') return '';
    const s = (b as Record<string, unknown>).status;
    return typeof s === 'string' ? s.toLowerCase() : '';
  };

  for (const b of normal) {
    const id = getId(b);
    if (!id) continue;
    byId.set(id, b);
  }
  for (const b of cancelled) {
    const id = getId(b);
    if (!id) continue;
    const existing = byId.get(id);
    if (!existing || getStatus(b) === 'cancelled') {
      byId.set(id, b);
    }
  }
  return [...byId.values()];
}

/**
 * Build the next cursor.
 *
 * FIX 2: NEVER advance lastModifiedAt to wall-clock now on empty response.
 *   - if at least one reservation has externalUpdatedAt → highest wins
 *   - else → preserve previous lastModifiedAt (may be null)
 *   - syncedAt is ARSAVAYA execution time (observability only)
 */
export function buildCursor(
  previous: { lastModifiedAt?: string | null } | null,
  reservations: readonly { externalUpdatedAt?: string }[],
  now: string = new Date().toISOString(),
): string {
  let latest = '';
  for (const r of reservations) {
    if (r.externalUpdatedAt && r.externalUpdatedAt > latest) {
      latest = r.externalUpdatedAt;
    }
  }
  const lastModifiedAt = latest || previous?.lastModifiedAt || null;
  const cursor: CursorShape = {
    v: 1,
    lastModifiedAt,
    syncedAt: now,
    mode: 'fallback-bounded-polling',
  };
  return JSON.stringify(cursor);
}

function extractDataArray(body: unknown): unknown[] {
  const w = Beds24ListWrapper.safeParse(body);
  if (w.success) return w.data.data ?? [];
  return Array.isArray(body) ? body : [];
}

export class Beds24Adapter implements ChannelManagerAdapter {
  readonly provider = PROVIDER;
  readonly capabilities = capabilitySet(
    'reservations.read',
    'properties.read',
    'units.read',
    'incrementalSync',
  );

  private readonly client: Beds24Client;
  private readonly config: AdapterConfig;
  private readonly tokenProvider?: () => string;
  private readonly isConfiguredFn?: () => boolean;
  private readonly nowFn: () => string;

  constructor(config: AdapterConfig, deps: Beds24AdapterDeps = {}) {
    this.config = config;
    this.client = deps.client ?? new Beds24Client({});
    this.tokenProvider = deps.tokenProvider;
    this.isConfiguredFn = deps.isConfiguredFn;
    this.nowFn = deps.nowFn ?? (() => new Date().toISOString());
  }

  private async resolveToken(): Promise<string> {
    if (this.tokenProvider) return this.tokenProvider();
    const mod = await import('./auth.ts');
    return mod.readTokenFromEnv();
  }

  private async resolveConfigured(): Promise<boolean> {
    if (this.isConfiguredFn) return this.isConfiguredFn();
    const mod = await import('./auth.ts');
    return mod.isConfigured();
  }

  async testConnection(): Promise<ConnectionTestResult> {
    try {
      if (!(await this.resolveConfigured())) {
        return { ok: false, message: 'BEDS24_READ_TOKEN is not configured' };
      }
      const token = await this.resolveToken();
      await this.client.request({
        path: '/properties',
        query: { includeAllRooms: 'false' },
        token,
      });
      return { ok: true, message: 'Connection OK' };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'unknown';
      return { ok: false, message: msg };
    }
  }

  async getAccount(): Promise<AccountInfo> {
    return { externalAccountId: 'beds24-account' };
  }

  async getProperties(): Promise<CanonicalProperty[]> {
    const r = await this.getPropertiesAndUnits();
    return r.properties;
  }

  async getUnits(): Promise<CanonicalUnit[]> {
    const r = await this.getPropertiesAndUnits();
    return r.units;
  }

  private async getPropertiesAndUnits(): Promise<{
    properties: CanonicalProperty[];
    units: CanonicalUnit[];
  }> {
    const token = await this.resolveToken();
    const body = await this.client.request({
      path: '/properties',
      query: { includeAllRooms: 'true' },
      token,
    });
    const items = extractDataArray(body);
    return mapBeds24Properties(items);
  }

  async getReservations(req: SyncRequest): Promise<CanonicalReservation[]> {
    const r = await this.sync(req);
    return r.reservations;
  }

  async getReservation(externalId: string): Promise<CanonicalReservation | null> {
    const token = await this.resolveToken();
    const body = await this.client.request({
      path: '/bookings',
      query: { id: externalId },
      token,
    });
    const items = extractDataArray(body);
    const first = items[0];
    if (!first) return null;
    const mapped = mapBeds24Booking(first);
    return mapped.ok ? mapped.value : null;
  }

  async sync(req: SyncRequest): Promise<SyncResult> {
    const previousCursor = this.parseCursor(req.cursor ?? null);
    const query = previousCursor?.lastModifiedAt
      ? buildIncrementalSyncQuery(previousCursor)
      : buildInitialSyncQuery();
    const params = toUrlParams(query);

    const token = await this.resolveToken();

    // FIX 1: In fallback mode, cancelled bookings are NOT returned by
    // the default date-range filter. Query them explicitly and merge.
    const [normalRaw, cancelledRaw] = await Promise.all([
      this.client.requestAllPages<unknown>(
        '/bookings',
        params,
        extractDataArray,
        token,
      ),
      this.client.requestAllPages<unknown>(
        '/bookings',
        { ...params, status: 'cancelled' },
        extractDataArray,
        token,
      ),
    ]);

    const merged = mergeRawBookings(normalRaw, cancelledRaw);

    const reservations: CanonicalReservation[] = [];
    for (const item of merged) {
      const m = mapBeds24Booking(item);
      if (m.ok) reservations.push(m.value);
    }

    const newCursor = buildCursor(previousCursor, reservations, this.nowFn());
    return {
      cursor: newCursor,
      reservations,
      receivedCount: reservations.length,
    };
  }

  async getConnectionHealth(): Promise<ConnectionHealth> {
    const t = await this.testConnection();
    return {
      state: t.ok ? 'HEALTHY' : 'ERROR',
      lastError: t.ok ? undefined : t.message,
      lastErrorAt: t.ok ? undefined : this.nowFn(),
      lastSuccessAt: t.ok ? this.nowFn() : undefined,
    };
  }

  private parseCursor(c: string | null): { lastModifiedAt?: string | null } | null {
    if (!c) return null;
    try {
      return JSON.parse(c) as { lastModifiedAt?: string | null };
    } catch {
      return null;
    }
  }
}

export function createBeds24Adapter(config: AdapterConfig): ChannelManagerAdapter {
  return new Beds24Adapter(config);
}