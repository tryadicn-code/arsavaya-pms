import { env } from 'cloudflare:workers';
import type { ReconciliationStatus } from './types.ts';
import type { SyncRunRecord, SyncRunStatus } from './sync-runs.ts';
import type { UnitMapping } from './unit-mapping.ts';

export function integrationDb(): D1Database {
  if (!env.DB) throw new Error('Penyimpanan belum tersedia.');
  return env.DB;
}

export type AccountRow = {
  id: string;
  workspace: string;
  provider: string;
  status: string;
  externalAccountId: string | null;
  credentialSource: string;
  configJson: string | null;
  lastSyncAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
};

export type IntegrationEventRow = {
  id: string;
  workspace: string;
  accountId: string;
  provider: string;
  eventType: string;
  externalId: string;
  entityKey: string;
  dedupeKey: string;
  externalUpdatedAt: string | null;
  localEntityId: string | null;
  reconciliationStatus: ReconciliationStatus;
  metadata: string | null;
  error: string | null;
  receivedAt: string;
  processedAt: string | null;
};

export async function getAccount(
  d1: D1Database,
  workspace: string,
  provider: string,
): Promise<AccountRow | null> {
  const row = await d1
    .prepare('SELECT * FROM channel_manager_accounts WHERE workspace=? AND provider=?')
    .bind(workspace, provider)
    .first<Record<string, unknown>>();
  return row ? mapAccount(row) : null;
}

export async function upsertAccount(d1: D1Database, account: AccountRow): Promise<void> {
  await d1
    .prepare(
      'INSERT INTO channel_manager_accounts ' +
        '(id,workspace,provider,status,external_account_id,credential_source,' +
        'config_json,last_sync_at,last_error,created_at,updated_at) ' +
        'VALUES (?,?,?,?,?,?,?,?,?,?,?) ' +
        'ON CONFLICT(workspace,provider) DO UPDATE SET ' +
        'status=excluded.status,' +
        'external_account_id=excluded.external_account_id,' +
        'credential_source=excluded.credential_source,' +
        'config_json=excluded.config_json,' +
        'last_sync_at=excluded.last_sync_at,' +
        'last_error=excluded.last_error,' +
        'updated_at=excluded.updated_at',
    )
    .bind(
      account.id,
      account.workspace,
      account.provider,
      account.status,
      account.externalAccountId,
      account.credentialSource,
      account.configJson,
      account.lastSyncAt,
      account.lastError,
      account.createdAt,
      account.updatedAt,
    )
    .run();
}

export async function listUnitMappings(
  d1: D1Database,
  accountId: string,
): Promise<UnitMapping[]> {
  const res = await d1
    .prepare('SELECT * FROM channel_manager_unit_mappings WHERE account_id=?')
    .bind(accountId)
    .all<Record<string, unknown>>();
  return (res.results ?? []).map(mapUnitMapping);
}

export async function upsertUnitMapping(d1: D1Database, m: UnitMapping): Promise<void> {
  await d1
    .prepare(
      'INSERT INTO channel_manager_unit_mappings ' +
        '(id,account_id,workspace,local_unit_id,external_property_id,external_unit_id,' +
        'confirmed,created_at,updated_at) ' +
        'VALUES (?,?,?,?,?,?,?,?,?) ' +
        'ON CONFLICT(id) DO UPDATE SET ' +
        'local_unit_id=excluded.local_unit_id,' +
        'external_property_id=excluded.external_property_id,' +
        'external_unit_id=excluded.external_unit_id,' +
        'confirmed=excluded.confirmed,' +
        'updated_at=excluded.updated_at',
    )
    .bind(
      m.id,
      m.accountId,
      m.workspace,
      m.localUnitId,
      m.externalPropertyId,
      m.externalUnitId,
      m.confirmed ? 1 : 0,
      m.createdAt,
      m.updatedAt,
    )
    .run();
}

export async function findEventByDedupe(
  d1: D1Database,
  dedupeKey: string,
): Promise<IntegrationEventRow | null> {
  const row = await d1
    .prepare('SELECT * FROM integration_events WHERE dedupe_key=?')
    .bind(dedupeKey)
    .first<Record<string, unknown>>();
  return row ? mapIntegrationEvent(row) : null;
}

export async function listPriorEventsByEntity(
  d1: D1Database,
  provider: string,
  accountId: string,
  entityKey: string,
): Promise<IntegrationEventRow[]> {
  const res = await d1
    .prepare(
      'SELECT * FROM integration_events ' +
        'WHERE provider=? AND account_id=? AND entity_key=? ' +
        'ORDER BY received_at DESC LIMIT 10',
    )
    .bind(provider, accountId, entityKey)
    .all<Record<string, unknown>>();
  return (res.results ?? []).map(mapIntegrationEvent);
}

export async function listEventsByExternalId(
  d1: D1Database,
  provider: string,
  accountId: string,
  externalId: string,
): Promise<IntegrationEventRow[]> {
  const res = await d1
    .prepare(
      'SELECT * FROM integration_events WHERE provider=? AND account_id=? AND external_id=? ORDER BY received_at DESC',
    )
    .bind(provider, accountId, externalId)
    .all<Record<string, unknown>>();
  return (res.results ?? []).map(mapIntegrationEvent);
}

export async function insertIntegrationEvent(
  d1: D1Database,
  ev: IntegrationEventRow,
): Promise<void> {
  await d1
    .prepare(
      'INSERT INTO integration_events ' +
        '(id,workspace,account_id,provider,event_type,external_id,entity_key,dedupe_key,' +
        'external_updated_at,local_entity_id,reconciliation_status,metadata,error,received_at,processed_at) ' +
        'VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
    )
    .bind(
      ev.id,
      ev.workspace,
      ev.accountId,
      ev.provider,
      ev.eventType,
      ev.externalId,
      ev.entityKey,
      ev.dedupeKey,
      ev.externalUpdatedAt,
      ev.localEntityId,
      ev.reconciliationStatus,
      ev.metadata,
      ev.error,
      ev.receivedAt,
      ev.processedAt,
    )
    .run();
}

export async function insertSyncRun(d1: D1Database, run: SyncRunRecord): Promise<void> {
  await d1
    .prepare(
      'INSERT INTO sync_runs ' +
        '(id,workspace,account_id,provider,sync_type,started_at,finished_at,status,' +
        'cursor_before,cursor_after,received_count,created_count,updated_count,' +
        'cancelled_count,conflict_count,error_count,last_error) ' +
        'VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
    )
    .bind(
      run.id,
      run.workspace,
      run.accountId,
      run.provider,
      run.syncType,
      run.startedAt,
      run.finishedAt ?? null,
      run.status,
      run.cursorBefore ?? null,
      run.cursorAfter ?? null,
      run.receivedCount,
      run.createdCount,
      run.updatedCount,
      run.cancelledCount,
      run.conflictCount,
      run.errorCount,
      run.lastError ?? null,
    )
    .run();
}

export async function updateSyncRun(d1: D1Database, run: SyncRunRecord): Promise<void> {
  await d1
    .prepare(
      'UPDATE sync_runs SET ' +
        'finished_at=?, status=?, cursor_after=?,' +
        'received_count=?, created_count=?, updated_count=?, cancelled_count=?,' +
        'conflict_count=?, error_count=?, last_error=? ' +
        'WHERE id=?',
    )
    .bind(
      run.finishedAt ?? null,
      run.status,
      run.cursorAfter ?? null,
      run.receivedCount,
      run.createdCount,
      run.updatedCount,
      run.cancelledCount,
      run.conflictCount,
      run.errorCount,
      run.lastError ?? null,
      run.id,
    )
    .run();
}

export async function getLatestSyncRun(
  d1: D1Database,
  accountId: string,
): Promise<SyncRunRecord | null> {
  const row = await d1
    .prepare('SELECT * FROM sync_runs WHERE account_id=? ORDER BY started_at DESC LIMIT 1')
    .bind(accountId)
    .first<Record<string, unknown>>();
  return row ? mapSyncRun(row) : null;
}

function mapAccount(r: Record<string, unknown>): AccountRow {
  return {
    id: String(r.id),
    workspace: String(r.workspace),
    provider: String(r.provider),
    status: String(r.status),
    externalAccountId: r.external_account_id == null ? null : String(r.external_account_id),
    credentialSource: String(r.credential_source),
    configJson: r.config_json == null ? null : String(r.config_json),
    lastSyncAt: r.last_sync_at == null ? null : String(r.last_sync_at),
    lastError: r.last_error == null ? null : String(r.last_error),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

function mapUnitMapping(r: Record<string, unknown>): UnitMapping {
  return {
    id: String(r.id),
    accountId: String(r.account_id),
    workspace: String(r.workspace),
    localUnitId: String(r.local_unit_id),
    externalPropertyId: String(r.external_property_id),
    externalUnitId: String(r.external_unit_id),
    confirmed: Number(r.confirmed) === 1,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

function mapIntegrationEvent(r: Record<string, unknown>): IntegrationEventRow {
  return {
    id: String(r.id),
    workspace: String(r.workspace),
    accountId: String(r.account_id),
    provider: String(r.provider),
    eventType: String(r.event_type),
    externalId: String(r.external_id),
    entityKey: String(r.entity_key),
    dedupeKey: String(r.dedupe_key),
    externalUpdatedAt: r.external_updated_at == null ? null : String(r.external_updated_at),
    localEntityId: r.local_entity_id == null ? null : String(r.local_entity_id),
    reconciliationStatus: String(r.reconciliation_status) as ReconciliationStatus,
    metadata: r.metadata == null ? null : String(r.metadata),
    error: r.error == null ? null : String(r.error),
    receivedAt: String(r.received_at),
    processedAt: r.processed_at == null ? null : String(r.processed_at),
  };
}

function mapSyncRun(r: Record<string, unknown>): SyncRunRecord {
  return {
    id: String(r.id),
    workspace: String(r.workspace),
    accountId: String(r.account_id),
    provider: String(r.provider),
    syncType: String(r.sync_type),
    startedAt: String(r.started_at),
    finishedAt: r.finished_at == null ? null : String(r.finished_at),
    status: String(r.status) as SyncRunStatus,
    cursorBefore: r.cursor_before == null ? null : String(r.cursor_before),
    cursorAfter: r.cursor_after == null ? null : String(r.cursor_after),
    receivedCount: Number(r.received_count ?? 0),
    createdCount: Number(r.created_count ?? 0),
    updatedCount: Number(r.updated_count ?? 0),
    cancelledCount: Number(r.cancelled_count ?? 0),
    conflictCount: Number(r.conflict_count ?? 0),
    needsReviewCount: 0, // no DB column — status still reflects PARTIAL via completeSyncRun
    errorCount: Number(r.error_count ?? 0),
    lastError: r.last_error == null ? null : String(r.last_error),
  };
}