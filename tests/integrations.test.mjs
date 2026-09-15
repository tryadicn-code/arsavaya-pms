import assert from 'node:assert/strict';

import {
  CAPABILITY,
  capabilitySet,
  hasCapability,
  missingCapabilities,
} from '../lib/integrations/capabilities.ts';
import {
  ERROR_CATEGORY,
  IntegrationError,
  normalizeError,
  isIntegrationError,
} from '../lib/integrations/errors.ts';
import { ProviderRegistry, createDefaultRegistry } from '../lib/integrations/registry.ts';
import { buildEntityKey, buildEventKey } from '../lib/integrations/idempotency.ts';
import {
  createUnitMapping,
  findMappingByExternal,
  findMappingByLocal,
  suggestMappings,
} from '../lib/integrations/unit-mapping.ts';
import { reconcile } from '../lib/integrations/reconciliation.ts';
import { computeSyncHealth } from '../lib/integrations/sync-health.ts';
import { newSyncRun, completeSyncRun } from '../lib/integrations/sync-runs.ts';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log('PASS:', name);
    passed++;
  } catch (e) {
    console.error('FAIL:', name, '-', e?.message ?? e);
    failed++;
  }
}

function makeMapping(over = {}) {
  return createUnitMapping({
    id: 'm1',
    accountId: 'acc1',
    workspace: 'live:u1',
    localUnitId: 'v1',
    externalPropertyId: 'prop1',
    externalUnitId: 'room1',
    confirmed: true,
    now: '2025-01-01T00:00:00.000Z',
    ...over,
  });
}

function makeReservation(over = {}) {
  return {
    provider: 'beds24',
    externalId: 'ext-1',
    externalUnitId: 'room1',
    arrival: '2025-06-01',
    departure: '2025-06-05',
    guestName: 'Test Guest',
    adults: 2,
    children: 0,
    status: 'CONFIRMED',
    ...over,
  };
}

function baseCtx(over = {}) {
  return {
    provider: 'beds24',
    accountId: 'acc1',
    workspace: 'live:u1',
    mappings: [makeMapping()],
    priorEvents: [],
    localBookings: [],
    ...over,
  };
}

function priorOf(over = {}) {
  return {
    entityKey: buildEntityKey({
      provider: 'beds24', accountId: 'acc1', entityType: 'reservation', externalId: 'ext-1',
    }),
    externalId: 'ext-1',
    externalUpdatedAt: null,
    localEntityId: 'RSV-1',
    status: 'NEW',
    processedAt: '2025-06-01T00:00:00.000Z',
    ...over,
  };
}

test('capabilities: set / has / missing', () => {
  const set = capabilitySet(CAPABILITY.reservationsRead, CAPABILITY.incrementalSync);
  assert.equal(hasCapability(set, CAPABILITY.reservationsRead), true);
  assert.equal(hasCapability(set, CAPABILITY.webhooks), false);
  assert.deepEqual(
    missingCapabilities(set, [CAPABILITY.reservationsRead, CAPABILITY.webhooks]),
    [CAPABILITY.webhooks],
  );
});

test('errors: normalizeError wraps unknown', () => {
  const e = normalizeError(new Error('boom'), 'beds24');
  assert.ok(isIntegrationError(e));
  assert.equal(e.category, ERROR_CATEGORY.unknown);
  assert.equal(e.provider, 'beds24');
});

test('errors: IntegrationError passthrough', () => {
  const orig = new IntegrationError(ERROR_CATEGORY.mapping, 'no mapping', { provider: 'beds24' });
  assert.equal(normalizeError(orig), orig);
});

test('registry: default registers beds24 and smoobu without factories', () => {
  const reg = createDefaultRegistry();
  assert.equal(reg.has('beds24'), true);
  assert.equal(reg.has('smoobu'), true);
  assert.equal(reg.instantiate('beds24', { accountId: 'a', workspace: 'w' }), undefined);
  assert.equal(reg.list().length, 2);
});

test('registry: duplicate registration throws', () => {
  const reg = new ProviderRegistry();
  reg.register({ id: 'x', displayName: 'X', capabilities: [] });
  assert.throws(() => reg.register({ id: 'x', displayName: 'X', capabilities: [] }));
});

test('registry: instantiate with factory', () => {
  const reg = new ProviderRegistry();
  const adapter = {
    provider: 'mock',
    capabilities: capabilitySet(CAPABILITY.reservationsRead),
  };
  reg.register({
    id: 'mock',
    displayName: 'Mock',
    capabilities: [CAPABILITY.reservationsRead],
    factory: () => adapter,
  });
  assert.equal(reg.instantiate('mock', { accountId: 'a', workspace: 'w' }), adapter);
});

test('idempotency: entity key is stable across events', () => {
  const k1 = buildEntityKey({
    provider: 'beds24', accountId: 'acc1', entityType: 'reservation', externalId: 'ext-1',
  });
  const k2 = buildEntityKey({
    provider: 'beds24', accountId: 'acc1', entityType: 'reservation', externalId: 'ext-1',
  });
  assert.equal(k1, k2);
  assert.equal(k1, 'entity|beds24|acc1|reservation|ext-1');
});

test('idempotency: duplicate exact event yields same event key', () => {
  const input = {
    provider: 'beds24', accountId: 'acc1', entityType: 'reservation', externalId: 'ext-1',
    externalUpdatedAt: '2025-06-01T10:00:00.000Z',
  };
  const a = buildEventKey(input);
  const b = buildEventKey(input);
  assert.equal(a, b);
});

test('idempotency: two updates on same reservation yield DIFFERENT event keys, SAME entity key', () => {
  const entity = { provider: 'beds24', accountId: 'acc1', entityType: 'reservation', externalId: 'ext-1' };
  const ev1 = buildEventKey({ ...entity, externalUpdatedAt: '2025-06-01T10:00:00.000Z' });
  const ev2 = buildEventKey({ ...entity, externalUpdatedAt: '2025-06-01T12:00:00.000Z' });
  assert.notEqual(ev1, ev2, 'event keys must differ');
  assert.equal(buildEntityKey(entity), buildEntityKey(entity), 'entity keys must match');
});

test('idempotency: eventId takes precedence over timestamps', () => {
  const k1 = buildEventKey({
    provider: 'b', accountId: 'a', entityType: 'reservation', externalId: 'x',
    eventId: 'evt-1', externalUpdatedAt: '2025-01-01T00:00:00.000Z',
  });
  const k2 = buildEventKey({
    provider: 'b', accountId: 'a', entityType: 'reservation', externalId: 'x',
    eventId: 'evt-1', externalUpdatedAt: '2030-01-01T00:00:00.000Z',
  });
  assert.equal(k1, k2);
});

test('idempotency: missing version info throws', () => {
  assert.throws(() =>
    buildEventKey({ provider: 'b', accountId: 'a', entityType: 'reservation', externalId: 'x' }),
  );
});

test('idempotency: missing required entity field throws', () => {
  assert.throws(() =>
    buildEntityKey({ provider: '', accountId: 'a', entityType: 'reservation', externalId: 'x' }),
  );
});

test('unit-mapping: create + find by local / external', () => {
  const m = makeMapping();
  assert.equal(findMappingByLocal([m], 'v1'), m);
  assert.equal(findMappingByExternal([m], 'room1'), m);
  assert.equal(findMappingByExternal([m], 'unknown'), undefined);
});

test('unit-mapping: suggestMappings scores by name similarity', () => {
  const suggestions = suggestMappings(
    [{ id: 'v1', name: 'Vila Satu' }, { id: 'v2', name: 'Vila Dua' }],
    [
      { externalId: 'r1', propertyExternalId: 'p1', name: 'vila satu' },
      { externalId: 'r2', propertyExternalId: 'p1', name: 'Something Else' },
    ],
  );
  assert.equal(suggestions[0].localUnitId, 'v1');
  assert.equal(suggestions[0].externalUnitId, 'r1');
});

test('reconcile: NEW when mapping exists and no conflict', () => {
  const decision = reconcile(makeReservation(), baseCtx(), 'event-key-1');
  assert.equal(decision.status, 'NEW');
  assert.equal(decision.localUnitId, 'v1');
  assert.equal(decision.eventKey, 'event-key-1');
});

test('reconcile: NEEDS_REVIEW when no mapping', () => {
  const decision = reconcile(makeReservation(), baseCtx({ mappings: [] }), 'ek1');
  assert.equal(decision.status, 'NEEDS_REVIEW');
});

test('reconcile: MATCHED when duplicate event without newer externalUpdatedAt', () => {
  const decision = reconcile(
    makeReservation({ externalUpdatedAt: '2025-06-01T10:00:00.000Z' }),
    baseCtx({ priorEvents: [priorOf({ externalUpdatedAt: '2025-06-01T10:00:00.000Z' })] }),
    'ek1',
  );
  assert.equal(decision.status, 'MATCHED');
  assert.equal(decision.localEntityId, 'RSV-1');
});

test('reconcile: UPDATED when newer externalUpdatedAt accepted', () => {
  const decision = reconcile(
    makeReservation({ externalUpdatedAt: '2025-06-01T12:00:00.000Z' }),
    baseCtx({ priorEvents: [priorOf({ externalUpdatedAt: '2025-06-01T10:00:00.000Z' })] }),
    'ek2',
  );
  assert.equal(decision.status, 'UPDATED');
  assert.equal(decision.localEntityId, 'RSV-1');
});

test('reconcile: OLD provider version ignored (MATCHED, not UPDATED)', () => {
  const decision = reconcile(
    makeReservation({ externalUpdatedAt: '2025-06-01T09:00:00.000Z' }),
    baseCtx({ priorEvents: [priorOf({ externalUpdatedAt: '2025-06-01T10:00:00.000Z' })] }),
    'ek1',
  );
  assert.equal(decision.status, 'MATCHED');
});

test('reconcile: same local booking reused on update (no duplicate)', () => {
  const decision = reconcile(
    makeReservation({ externalUpdatedAt: '2025-06-01T12:00:00.000Z' }),
    baseCtx({ priorEvents: [priorOf({ externalUpdatedAt: '2025-06-01T10:00:00.000Z', localEntityId: 'RSV-1' })] }),
    'ek2',
  );
  assert.equal(decision.localEntityId, 'RSV-1');
});

test('reconcile: UPDATED when prior has no version marker but incoming does', () => {
  const decision = reconcile(
    makeReservation({ externalUpdatedAt: '2025-06-01T12:00:00.000Z' }),
    baseCtx({ priorEvents: [priorOf({ externalUpdatedAt: null })] }),
    'ek2',
  );
  assert.equal(decision.status, 'UPDATED');
});

test('reconcile: MATCHED when incoming has no version marker but prior does', () => {
  const decision = reconcile(
    makeReservation({ externalUpdatedAt: null }),
    baseCtx({ priorEvents: [priorOf({ externalUpdatedAt: '2025-06-01T10:00:00.000Z' })] }),
    'ek1',
  );
  assert.equal(decision.status, 'MATCHED');
});

test('reconcile: CANCELLED preserves local entity', () => {
  const decision = reconcile(
    makeReservation({ status: 'CANCELLED' }),
    baseCtx({ priorEvents: [priorOf()] }),
    'ek-cancel',
  );
  assert.equal(decision.status, 'CANCELLED');
  assert.equal(decision.localEntityId, 'RSV-1');
});

test('reconcile: cancellation without prior -> NEEDS_REVIEW', () => {
  const decision = reconcile(
    makeReservation({ status: 'CANCELLED' }),
    baseCtx({ priorEvents: [] }),
    'ek-cancel',
  );
  assert.equal(decision.status, 'NEEDS_REVIEW');
});

test('reconcile: CONFLICT with overlapping local booking', () => {
  const decision = reconcile(
    makeReservation(),
    baseCtx({
      localBookings: [
        { id: 'RSV-LOCAL', unitId: 'v1', start: '2025-06-03', end: '2025-06-07', status: 'Confirmed' },
      ],
    }),
    'ek1',
  );
  assert.equal(decision.status, 'CONFLICT');
  assert.equal(decision.localEntityId, 'RSV-LOCAL');
});

test('reconcile: no conflict when local booking linked to same external', () => {
  const decision = reconcile(
    makeReservation(),
    baseCtx({
      localBookings: [
        {
          id: 'RSV-LOCAL', unitId: 'v1', start: '2025-06-03', end: '2025-06-07',
          status: 'Confirmed', linkedExternalProvider: 'beds24', linkedExternalId: 'ext-1',
        },
      ],
    }),
    'ek1',
  );
  assert.equal(decision.status, 'NEW');
});

test('reconcile: MATCHED from duplicate exact event (idempotency behavior)', () => {
  const same = makeReservation({ externalUpdatedAt: '2025-06-01T10:00:00.000Z' });
  const prior = priorOf({ externalUpdatedAt: '2025-06-01T10:00:00.000Z', localEntityId: 'RSV-1' });
  const d1 = reconcile(same, baseCtx({ priorEvents: [prior] }), 'ek1');
  const d2 = reconcile(same, baseCtx({ priorEvents: [prior] }), 'ek1');
  assert.equal(d1.status, 'MATCHED');
  assert.equal(d2.status, 'MATCHED');
  assert.equal(d1.localEntityId, d2.localEntityId);
});

test('sync-health: NOT_CONFIGURED', () => {
  assert.equal(
    computeSyncHealth({ configured: false, connected: false, mappedUnits: 0, totalUnits: 8 }),
    'NOT_CONFIGURED',
  );
});

test('sync-health: DISCONNECTED when not connected', () => {
  assert.equal(
    computeSyncHealth({ configured: true, connected: false, mappedUnits: 0, totalUnits: 8 }),
    'DISCONNECTED',
  );
});

test('sync-health: NEEDS_MAPPING', () => {
  assert.equal(
    computeSyncHealth({ configured: true, connected: true, mappedUnits: 3, totalUnits: 8 }),
    'NEEDS_MAPPING',
  );
});

test('sync-health: SYNCING overrides', () => {
  assert.equal(
    computeSyncHealth({ configured: true, connected: true, mappedUnits: 8, totalUnits: 8, isSyncing: true }),
    'SYNCING',
  );
});

test('sync-health: ERROR when lastError and no success', () => {
  assert.equal(
    computeSyncHealth({
      configured: true, connected: true, mappedUnits: 8, totalUnits: 8,
      lastError: 'boom', lastSuccessAt: null,
    }),
    'ERROR',
  );
});

test('sync-health: WARNING when failed events exist', () => {
  assert.equal(
    computeSyncHealth({
      configured: true, connected: true, mappedUnits: 8, totalUnits: 8,
      lastSuccessAt: '2025-01-01T00:00:00.000Z', failedEvents: 2,
    }),
    'WARNING',
  );
});

test('sync-health: HEALTHY after successful sync', () => {
  assert.equal(
    computeSyncHealth({
      configured: true, connected: true, mappedUnits: 8, totalUnits: 8,
      lastSuccessAt: '2025-01-01T00:00:00.000Z',
    }),
    'HEALTHY',
  );
});

test('sync-runs: new run starts RUNNING with zero counts', () => {
  const run = newSyncRun({
    id: 'sr1', workspace: 'live:u1', accountId: 'acc1', provider: 'beds24',
    cursorBefore: null, now: '2025-01-01T00:00:00.000Z',
  });
  assert.equal(run.status, 'RUNNING');
  assert.equal(run.receivedCount, 0);
  assert.equal(run.cursorBefore, null);
});

test('sync-runs: SUCCESS when no errors or conflicts', () => {
  const run = completeSyncRun(
    newSyncRun({ id: 'sr1', workspace: 'w', accountId: 'a', provider: 'p' }),
    { receivedCount: 5, createdCount: 3, updatedCount: 2, cursorAfter: 'cursor-xyz' },
  );
  assert.equal(run.status, 'SUCCESS');
  assert.equal(run.cursorAfter, 'cursor-xyz');
  assert.equal(run.createdCount, 3);
});

test('sync-runs: PARTIAL on conflicts', () => {
  const run = completeSyncRun(
    newSyncRun({ id: 'sr1', workspace: 'w', accountId: 'a', provider: 'p' }),
    { receivedCount: 5, createdCount: 3, conflictCount: 2 },
  );
  assert.equal(run.status, 'PARTIAL');
});

test('sync-runs: FAILED when errors and nothing received', () => {
  const run = completeSyncRun(
    newSyncRun({ id: 'sr1', workspace: 'w', accountId: 'a', provider: 'p' }),
    { errorCount: 1, lastError: 'network down' },
  );
  assert.equal(run.status, 'FAILED');
  assert.equal(run.lastError, 'network down');
});

test('sync-runs: cursor is opaque string', () => {
  const run = completeSyncRun(
    newSyncRun({ id: 'sr1', workspace: 'w', accountId: 'a', provider: 'p' }),
    { cursorAfter: 'beds24::v2::xyz' },
  );
  assert.equal(typeof run.cursorAfter, 'string');
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);