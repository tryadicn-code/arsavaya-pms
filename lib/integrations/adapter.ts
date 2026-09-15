import type { CapabilitySet } from './capabilities.ts';
import type {
  CanonicalProperty,
  CanonicalReservation,
  CanonicalUnit,
} from './types.ts';

export type ConnectionTestResult = { ok: boolean; message?: string };

export type AccountInfo = {
  externalAccountId: string;
  displayName?: string;
};

export type SyncCursor = string | null;

export type SyncRequest = {
  cursor?: SyncCursor;
  since?: string;
};

export type SyncResult = {
  cursor: SyncCursor;
  reservations: CanonicalReservation[];
  receivedCount: number;
};

export type ConnectionHealth = {
  state: 'HEALTHY' | 'WARNING' | 'ERROR' | 'DISCONNECTED';
  lastSuccessAt?: string;
  lastErrorAt?: string;
  lastError?: string;
};

export type AdapterConfig = {
  accountId: string;
  workspace: string;
  config?: Record<string, unknown>;
};

export interface ChannelManagerAdapter {
  readonly provider: string;
  readonly capabilities: CapabilitySet;

  testConnection?(): Promise<ConnectionTestResult>;
  getAccount?(): Promise<AccountInfo>;
  getProperties?(): Promise<CanonicalProperty[]>;
  getUnits?(): Promise<CanonicalUnit[]>;
  getReservations?(req: SyncRequest): Promise<CanonicalReservation[]>;
  getReservation?(externalId: string): Promise<CanonicalReservation | null>;
  getConnectionHealth?(): Promise<ConnectionHealth>;
  sync?(req: SyncRequest): Promise<SyncResult>;
}

export type AdapterFactory = (config: AdapterConfig) => ChannelManagerAdapter;