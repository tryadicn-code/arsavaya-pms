/**
 * Beds24 sync orchestration.
 * Fetches reservations, reconciles, applies to PMS workspace with CAS.
 */
import { Beds24Adapter } from './adapter.ts';
import { applyCanonicalReservation } from './apply.ts';
import {
  insertIntegrationEvent,
  insertSyncRun,
  updateSyncRun,
  listPriorEventsByEntity,
  listUnitMappings,
  getLatestSyncRun,
  type IntegrationEventRow,
} from '../db.ts';
import { reconcile } from '../reconciliation.ts';
import { buildEntityKey, buildEventKey } from '../idempotency.ts';
import { completeSyncRun, newSyncRun, type SyncRunRecord } from '../sync-runs.ts';
import type { CanonicalReservation } from '../types.ts';
import type { State } from '../../pms.ts';

export type SyncMode = 'initial' | 'incremental';

export type SyncOutcome = {
  run: SyncRunRecord;
  applied: {
    created: number;
    updated: number;
    cancelled: number;
    unchanged: number;
    conflict: number;
    needsReview: number;
  };
  errors: string[];
};

export type SyncDeps = {
  adapter: Beds24Adapter;
  db: D1Database;
  loadWorkspace: () => Promise<{ version: number; state: State } | null>;
  saveWorkspace: (version: number, state: State) => Promise<boolean>;
  workspace: string;
  accountId: string;
  provider: string;
  now?: () => string;
};

const MAX_CAS_RETRIES = 3;

export async function runBeds24Sync(
  mode: SyncMode,
  deps: SyncDeps,
): Promise<SyncOutcome> {
  const now = deps.now ?? (() => new Date().toISOString());
  const lastRun = await getLatestSyncRun(deps.db, deps.accountId);
  const cursorBefore = mode === 'incremental' ? lastRun?.cursorAfter ?? null : null;

  const run = newSyncRun({
    id: crypto.randomUUID(),
    workspace: deps.workspace,
    accountId: deps.accountId,
    provider: deps.provider,
    cursorBefore,
    now: now(),
  });
  await insertSyncRun(deps.db, run);

  const applied = {
    created: 0,
    updated: 0,
    cancelled: 0,
    unchanged: 0,
    conflict: 0,
    needsReview: 0,
  };
  const errors: string[] = [];

  let syncResult;
  try {
    syncResult = await deps.adapter.sync({ cursor: cursorBefore });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'adapter error';
    errors.push(msg);
    const failed = completeSyncRun(run, { errorCount: 1, lastError: msg, now: now() });
    await updateSyncRun(deps.db, failed);
    return { run: failed, applied, errors };
  }

  let mappings;
  try {
    mappings = await listUnitMappings(deps.db, deps.accountId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'mapping load error';
    errors.push(msg);
    const failed = completeSyncRun(run, { errorCount: 1, lastError: msg, now: now() });
    await updateSyncRun(deps.db, failed);
    return { run: failed, applied, errors };
  }

  const ws = await deps.loadWorkspace();
  if (!ws) {
    errors.push('workspace not found');
    const failed = completeSyncRun(run, { errorCount: 1, lastError: 'workspace not found', now: now() });
    await updateSyncRun(deps.db, failed);
    return { run: failed, applied, errors };
  }

  let workingState = ws.state;
  let stateModified = false;

  for (const canonical of syncResult.reservations) {
    const entityKey = buildEntityKey({
      provider: deps.provider,
      accountId: deps.accountId,
      entityType: 'reservation',
      externalId: canonical.externalId,
    });
    const eventKey = buildEventKey({
      provider: deps.provider,
      accountId: deps.accountId,
      entityType: 'reservation',
      externalId: canonical.externalId,
      externalUpdatedAt: canonical.externalUpdatedAt ?? null,
    });

let priorEvents: IntegrationEventRow[] = [];
    try {
      priorEvents = await listPriorEventsByEntity(
        deps.db,
        deps.provider,
        deps.accountId,
        entityKey,
      );
    } catch {
      priorEvents = [];
    }
    const prior = priorEvents.map((p) => ({
      entityKey: p.entityKey,
      externalId: p.externalId,
      externalUpdatedAt: p.externalUpdatedAt,
      localEntityId: p.localEntityId,
      status: p.reconciliationStatus,
      processedAt: p.processedAt,
    }));

    const localBookings = workingState.bookings.map((b) => ({
      id: b.id,
      unitId: b.unit,
      start: b.start,
      end: b.end,
      status: b.status,
    }));

    const decision = reconcile(
      canonical,
      {
        provider: deps.provider,
        accountId: deps.accountId,
        workspace: deps.workspace,
        mappings,
        priorEvents: prior,
        localBookings,
      },
      eventKey,
    );

    const mapping = mappings.find(
      (m) => m.externalUnitId === canonical.externalUnitId && m.confirmed,
    );
    const existing = prior[0]?.localEntityId ?? null;

    if (decision.status === 'CONFLICT' || decision.status === 'NEEDS_REVIEW') {
      if (decision.status === 'CONFLICT') applied.conflict++;
      else applied.needsReview++;
      try {
        await insertIntegrationEvent(
          deps.db,
          eventRow(deps, canonical, entityKey, eventKey, decision.status, existing, decision.reason),
        );
      } catch (e) {
        errors.push(String(e));
      }
      continue;
    }

    const result = applyCanonicalReservation(workingState, canonical, mapping ?? null, existing);
    if (!result.ok) {
      if (result.reason === 'conflict') {
        applied.conflict++;
        try {
          await insertIntegrationEvent(
            deps.db,
            eventRow(deps, canonical, entityKey, eventKey, 'CONFLICT', existing, result.detail),
          );
        } catch (e) {
          errors.push(String(e));
        }
        continue;
      }
      applied.needsReview++;
      try {
        await insertIntegrationEvent(
          deps.db,
          eventRow(
            deps,
            canonical,
            entityKey,
            eventKey,
            'NEEDS_REVIEW',
            existing,
            result.detail ?? result.reason,
          ),
        );
      } catch (e) {
        errors.push(String(e));
      }
      continue;
    }

    workingState = result.state;
    if (result.action === 'created') applied.created++;
    else if (result.action === 'updated') applied.updated++;
    else if (result.action === 'cancelled') applied.cancelled++;
    else applied.unchanged++;

    stateModified = true;
    try {
      await insertIntegrationEvent(
        deps.db,
        eventRow(deps, canonical, entityKey, eventKey, decision.status, result.localEntityId, undefined),
      );
    } catch (e) {
      const msg = String(e);
      if (!msg.includes('UNIQUE') && !msg.includes('constraint')) errors.push(msg);
    }
  }

  if (stateModified) {
    let saved = false;
    let version = ws.version;
    let state = workingState;
    for (let i = 0; i < MAX_CAS_RETRIES; i++) {
      saved = await deps.saveWorkspace(version, state);
      if (saved) break;
      const fresh = await deps.loadWorkspace();
      if (!fresh) break;
      version = fresh.version;
      let s2 = fresh.state;
      for (const canonical of syncResult.reservations) {
        const entityKey = buildEntityKey({
          provider: deps.provider,
          accountId: deps.accountId,
          entityType: 'reservation',
          externalId: canonical.externalId,
        });
        const priorEvents = await listPriorEventsByEntity(
          deps.db,
          deps.provider,
          deps.accountId,
          entityKey,
        ).catch(() => []);
        const existing = priorEvents[0]?.localEntityId ?? null;
        const mapping = mappings.find(
          (m) => m.externalUnitId === canonical.externalUnitId && m.confirmed,
        );
        const r = applyCanonicalReservation(s2, canonical, mapping ?? null, existing);
        if (r.ok) s2 = r.state;
      }
      state = s2;
    }
    if (!saved) errors.push('CAS failed after retries');
  }

  const finalRun = completeSyncRun(run, {
    cursorAfter: syncResult.cursor,
    receivedCount: syncResult.receivedCount,
    createdCount: applied.created,
    updatedCount: applied.updated,
    cancelledCount: applied.cancelled,
    conflictCount: applied.conflict,
    needsReviewCount: applied.needsReview,
    errorCount: errors.length,
    lastError: errors[0] ?? null,
    now: now(),
  });
  await updateSyncRun(deps.db, finalRun);

  return { run: finalRun, applied, errors };
}

function eventRow(
  deps: SyncDeps,
  canonical: CanonicalReservation,
  entityKey: string,
  eventKey: string,
  status: string,
  localEntityId: string | null,
  detail: string | undefined,
): IntegrationEventRow {
  return {
    id: crypto.randomUUID(),
    workspace: deps.workspace,
    accountId: deps.accountId,
    provider: deps.provider,
    eventType: 'reservation',
    externalId: canonical.externalId,
    entityKey,
    dedupeKey: eventKey,
    externalUpdatedAt: canonical.externalUpdatedAt ?? null,
    localEntityId,
    reconciliationStatus: status as IntegrationEventRow['reconciliationStatus'],
    metadata: JSON.stringify({
      arrival: canonical.arrival,
      departure: canonical.departure,
      externalUnitId: canonical.externalUnitId,
      channel: canonical.externalChannel,
    }),
    error: detail ?? null,
    receivedAt: new Date().toISOString(),
    processedAt: new Date().toISOString(),
  };
}