import type { Capability } from './capabilities.ts';

export type ReconciliationStatus =
  | 'NEW'
  | 'MATCHED'
  | 'UPDATED'
  | 'CANCELLED'
  | 'CONFLICT'
  | 'NEEDS_REVIEW';

export type SyncHealthState =
  | 'NOT_CONFIGURED'
  | 'CONNECTED'
  | 'NEEDS_MAPPING'
  | 'SYNCING'
  | 'HEALTHY'
  | 'WARNING'
  | 'ERROR'
  | 'DISCONNECTED';

export type AccountStatus = SyncHealthState;

export type ExternalMetadata = {
  provider: string;
  id: string;
  reference?: string;
  channel?: string;
  syncStatus?: 'PENDING' | 'SYNCED' | ReconciliationStatus;
  lastSyncedAt?: string;
  lastError?: string;
};

export type CanonicalProperty = {
  provider: string;
  externalId: string;
  name: string;
  raw?: unknown;
};

export type CanonicalUnit = {
  provider: string;
  externalId: string;
  propertyExternalId: string;
  name: string;
  capacity?: number;
  raw?: unknown;
};

export type CanonicalReservationStatus =
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'PENDING'
  | 'NO_SHOW'
  | 'UNKNOWN';

export type CanonicalReservation = {
  provider: string;
  externalId: string;
  externalReference?: string;
  externalChannel?: string;

  /**
   * Stable Beds24 room/unit ID (or provider-equivalent).
   * MUST match channel_manager_unit_mappings.external_unit_id.
   * The property ID is stored separately in externalPropertyId.
   */
  externalUnitId: string;

  /** Beds24 property ID. Optional — not used for mapping lookup. */
  externalPropertyId?: string;

  localUnitId?: string;
  arrival: string;
  departure: string;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  adults: number;
  children: number;
  status: CanonicalReservationStatus;
  price?: number;
  currency?: string;
  createdAt?: string;
  externalUpdatedAt?: string;
  externalRevision?: string;
};

export type ProviderDefinition = {
  id: string;
  displayName: string;
  capabilities: Capability[];
};