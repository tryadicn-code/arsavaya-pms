import type { SyncHealthState } from './types.ts';

export type HealthInput = {
  configured: boolean;
  connected: boolean;
  mappedUnits: number;
  totalUnits: number;
  isSyncing?: boolean;
  lastSuccessAt?: string | null;
  lastAttemptAt?: string | null;
  lastError?: string | null;
  pendingEvents?: number;
  failedEvents?: number;
};

export function computeSyncHealth(input: HealthInput): SyncHealthState {
  if (!input.configured) return 'NOT_CONFIGURED';
  if (!input.connected) return 'DISCONNECTED';
  if (input.isSyncing) return 'SYNCING';
  if (input.totalUnits > 0 && input.mappedUnits < input.totalUnits) return 'NEEDS_MAPPING';
  if (input.lastError && !input.lastSuccessAt) return 'ERROR';
  if ((input.failedEvents ?? 0) > 0) return 'WARNING';
  if (input.lastSuccessAt) return 'HEALTHY';
  return 'CONNECTED';
}