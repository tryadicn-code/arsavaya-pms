import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const workspace = sqliteTable('pms_workspace', {
  id: text('id').primaryKey(),
  version: integer('version').notNull().default(0),
  data: text('data').notNull(),
});

export const feedKeys = sqliteTable('pms_feed_keys', {
  hash: text('hash').primaryKey(),
  workspace: text('workspace').notNull(),
  connection: text('connection').notNull(),
});

export const channelManagerAccounts = sqliteTable(
  'channel_manager_accounts',
  {
    id: text('id').primaryKey(),
    workspace: text('workspace').notNull(),
    provider: text('provider').notNull(),
    status: text('status').notNull(),
    externalAccountId: text('external_account_id'),
    credentialSource: text('credential_source').notNull(),
    configJson: text('config_json'),
    lastSyncAt: text('last_sync_at'),
    lastError: text('last_error'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [
    uniqueIndex('channel_manager_accounts_workspace_provider_unique').on(t.workspace, t.provider),
    index('channel_manager_accounts_workspace_idx').on(t.workspace),
  ],
);

export const channelManagerUnitMappings = sqliteTable(
  'channel_manager_unit_mappings',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    workspace: text('workspace').notNull(),
    localUnitId: text('local_unit_id').notNull(),
    externalPropertyId: text('external_property_id').notNull(),
    externalUnitId: text('external_unit_id').notNull(),
    confirmed: integer('confirmed').notNull().default(0),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [
    uniqueIndex('channel_manager_unit_mappings_account_local_unique').on(t.accountId, t.localUnitId),
    uniqueIndex('channel_manager_unit_mappings_account_external_unique').on(
      t.accountId,
      t.externalPropertyId,
      t.externalUnitId,
    ),
    index('channel_manager_unit_mappings_workspace_idx').on(t.workspace),
  ],
);

export const integrationEvents = sqliteTable(
  'integration_events',
  {
    id: text('id').primaryKey(),
    workspace: text('workspace').notNull(),
    accountId: text('account_id').notNull(),
    provider: text('provider').notNull(),
    eventType: text('event_type').notNull(),
    externalId: text('external_id').notNull(),
    entityKey: text('entity_key').notNull(),
    dedupeKey: text('dedupe_key').notNull(),
    externalUpdatedAt: text('external_updated_at'),
    localEntityId: text('local_entity_id'),
    reconciliationStatus: text('reconciliation_status').notNull(),
    metadata: text('metadata'),
    error: text('error'),
    receivedAt: text('received_at').notNull(),
    processedAt: text('processed_at'),
  },
  (t) => [
    uniqueIndex('integration_events_dedupe_key_unique').on(t.dedupeKey),
    index('integration_events_entity_key_idx').on(t.provider, t.accountId, t.entityKey),
    index('integration_events_external_idx').on(t.provider, t.accountId, t.externalId),
    index('integration_events_workspace_idx').on(t.workspace),
  ],
);

export const syncRuns = sqliteTable(
  'sync_runs',
  {
    id: text('id').primaryKey(),
    workspace: text('workspace').notNull(),
    accountId: text('account_id').notNull(),
    provider: text('provider').notNull(),
    syncType: text('sync_type').notNull(),
    startedAt: text('started_at').notNull(),
    finishedAt: text('finished_at'),
    status: text('status').notNull(),
    cursorBefore: text('cursor_before'),
    cursorAfter: text('cursor_after'),
    receivedCount: integer('received_count').notNull().default(0),
    createdCount: integer('created_count').notNull().default(0),
    updatedCount: integer('updated_count').notNull().default(0),
    cancelledCount: integer('cancelled_count').notNull().default(0),
    conflictCount: integer('conflict_count').notNull().default(0),
    errorCount: integer('error_count').notNull().default(0),
    lastError: text('last_error'),
  },
  (t) => [
    index('sync_runs_account_idx').on(t.accountId, t.startedAt),
    index('sync_runs_workspace_idx').on(t.workspace),
  ],
);