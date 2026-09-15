export type SyncRunStatus = 'RUNNING' | 'SUCCESS' | 'PARTIAL' | 'FAILED';

export type SyncRunRecord = {
  id: string;
  workspace: string;
  accountId: string;
  provider: string;
  syncType: string;
  startedAt: string;
  finishedAt?: string | null;
  status: SyncRunStatus;
  cursorBefore?: string | null;
  cursorAfter?: string | null;
  receivedCount: number;
  createdCount: number;
  updatedCount: number;
  cancelledCount: number;
  conflictCount: number;
  errorCount: number;
  lastError?: string | null;
};

export function newSyncRun(input: {
  id: string;
  workspace: string;
  accountId: string;
  provider: string;
  syncType?: string;
  cursorBefore?: string | null;
  now?: string;
}): SyncRunRecord {
  return {
    id: input.id,
    workspace: input.workspace,
    accountId: input.accountId,
    provider: input.provider,
    syncType: input.syncType ?? 'reservations',
    startedAt: input.now ?? new Date().toISOString(),
    finishedAt: null,
    status: 'RUNNING',
    cursorBefore: input.cursorBefore ?? null,
    cursorAfter: null,
    receivedCount: 0,
    createdCount: 0,
    updatedCount: 0,
    cancelledCount: 0,
    conflictCount: 0,
    errorCount: 0,
    lastError: null,
  };
}

export function completeSyncRun(
  run: SyncRunRecord,
  summary: {
    cursorAfter?: string | null;
    receivedCount?: number;
    createdCount?: number;
    updatedCount?: number;
    cancelledCount?: number;
    conflictCount?: number;
    errorCount?: number;
    lastError?: string | null;
    now?: string;
  },
): SyncRunRecord {
  const finishedAt = summary.now ?? new Date().toISOString();
  const errorCount = summary.errorCount ?? 0;
  const receivedCount = summary.receivedCount ?? 0;
  const conflictCount = summary.conflictCount ?? 0;

  let status: SyncRunStatus;
  if (errorCount > 0 && receivedCount === 0) status = 'FAILED';
  else if (errorCount > 0 || conflictCount > 0) status = 'PARTIAL';
  else status = 'SUCCESS';

  return {
    ...run,
    status,
    finishedAt,
    cursorAfter: summary.cursorAfter ?? null,
    receivedCount,
    createdCount: summary.createdCount ?? 0,
    updatedCount: summary.updatedCount ?? 0,
    cancelledCount: summary.cancelledCount ?? 0,
    conflictCount,
    errorCount,
    lastError: summary.lastError ?? null,
  };
}