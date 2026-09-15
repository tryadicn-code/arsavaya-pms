/**
 * Beds24 ChannelManagerAdapter implementation. SERVER ONLY.
 */
import { Beds24Client } from './client.ts';
import { isConfigured, readTokenFromEnv } from './auth.ts';
import { mapBeds24Booking, mapBeds24Properties } from './mapper.ts';
import { buildInitialSyncQuery, buildIncrementalSyncQuery, toUrlParams } from './query.ts';
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
import type { CanonicalProperty, CanonicalReservation, CanonicalUnit } from '../types.ts';

const PROVIDER = 'beds24';

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

  constructor(config: AdapterConfig, deps: { client?: Beds24Client } = {}) {
    this.config = config;
    this.client = deps.client ?? new Beds24Client({});
  }

  async testConnection(): Promise<ConnectionTestResult> {
    try {
      if (!isConfigured()) {
        return { ok: false, message: 'BEDS24_READ_TOKEN is not configured' };
      }
      const token = readTokenFromEnv();
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
    const token = readTokenFromEnv();
    const body = await this.client.request({
      path: '/properties',
      query: { includeAllRooms: 'true' },
      token,
    });
    const wrapper = Beds24ListWrapper.safeParse(body);
    const items = wrapper.success
      ? wrapper.data.data ?? []
      : Array.isArray(body)
        ? body
        : [];
    return mapBeds24Properties(items);
  }

  async getReservations(req: SyncRequest): Promise<CanonicalReservation[]> {
    const r = await this.sync(req);
    return r.reservations;
  }

  async getReservation(externalId: string): Promise<CanonicalReservation | null> {
    const token = readTokenFromEnv();
    const body = await this.client.request({
      path: '/bookings',
      query: { id: externalId },
      token,
    });
    const wrapper = Beds24ListWrapper.safeParse(body);
    const items = wrapper.success ? wrapper.data.data ?? [] : [];
    const first = items[0];
    if (!first) return null;
    const mapped = mapBeds24Booking(first);
    return mapped.ok ? mapped.value : null;
  }

  async sync(req: SyncRequest): Promise<SyncResult> {
    const cursor = this.parseCursor(req.cursor ?? null);
    const query = cursor?.lastModifiedAt
      ? buildIncrementalSyncQuery(cursor)
      : buildInitialSyncQuery();
    const params = toUrlParams(query);

    const token = readTokenFromEnv();
    const raw = await this.client.requestAllPages<unknown>(
      '/bookings',
      params,
      (body) => {
        const w = Beds24ListWrapper.safeParse(body);
        return w.success ? w.data.data ?? [] : Array.isArray(body) ? body : [];
      },
      token,
    );

    const reservations: CanonicalReservation[] = [];
    for (const item of raw) {
      const m = mapBeds24Booking(item);
      if (m.ok) reservations.push(m.value);
    }

    const newCursor = this.buildCursor(reservations);
    return { cursor: newCursor, reservations, receivedCount: reservations.length };
  }

  async getConnectionHealth(): Promise<ConnectionHealth> {
    const t = await this.testConnection();
    return {
      state: t.ok ? 'HEALTHY' : 'ERROR',
      lastError: t.ok ? undefined : t.message,
      lastErrorAt: t.ok ? undefined : new Date().toISOString(),
      lastSuccessAt: t.ok ? new Date().toISOString() : undefined,
    };
  }

  private parseCursor(c: string | null): { lastModifiedAt?: string } | null {
    if (!c) return null;
    try {
      return JSON.parse(c) as { lastModifiedAt?: string };
    } catch {
      return null;
    }
  }

  private buildCursor(reservations: CanonicalReservation[]): string {
    let latest = '';
    for (const r of reservations) {
      if (r.externalUpdatedAt && r.externalUpdatedAt > latest) {
        latest = r.externalUpdatedAt;
      }
    }
    return JSON.stringify({
      v: 1,
      lastModifiedAt: latest || new Date().toISOString(),
      syncedAt: new Date().toISOString(),
    });
  }
}

export function createBeds24Adapter(config: AdapterConfig): ChannelManagerAdapter {
  return new Beds24Adapter(config);
}