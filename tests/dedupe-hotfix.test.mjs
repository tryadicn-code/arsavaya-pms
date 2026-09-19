import assert from 'node:assert/strict';
import { register } from 'node:module';

import { buildEntityKey, buildEventKey } from '../lib/integrations/idempotency.ts';

// lib/integrations/db.ts imports the Cloudflare-only bare specifier
// "cloudflare:workers". Register a resolve hook BEFORE dynamically importing
// it so the module graph loads under plain Node for "node --test".
const cfShim = new URL(
  'data:text/javascript,' +
    encodeURIComponent(
      'export async function resolve(specifier, context, nextResolve){' +
        ' if(specifier==="cloudflare:workers")' +
        ' return {url:"data:text/javascript,export const env={}", shortCircuit:true};' +
        ' return nextResolve(specifier, context);' +
        '}',
    ),
).href;
register(cfShim);

const { recordIntegrationEvent, insertIntegrationEvent, findEventByDedupe } = await import(
  '../lib/integrations/db.ts'
);
const { runBeds24Sync } = await import('../lib/integrations/beds24/sync.ts');

let passed = 0;
let failed = 0;
const queue = [];

function test(name, fn) {
  queue.push({ name, fn });
}

async function runAll() {
  for (const { name, fn } of queue) {
    try {
      await fn();
      passed++;
      console.log('PASS: ' + name);
    } catch (e) {
      failed++;
      console.log('FAIL: ' + name + ' — ' + (e && e.message ? e.message : e));
    }
  }
  console.log('--- ' + passed + ' passed, ' + failed + ' failed ---');
  if (failed > 0) process.exitCode = 1;
}
const ACCOUNT = 'acc-1';
const WORKSPACE = 'ws-1';
const UNIQUE_MSG =
  'D1_ERROR: UNIQUE constraint failed: integration_events.dedupe_key: SQLITE_CONSTRAINT_UNIQUE';

// ---------------------------------------------------------------------------
// In-memory D1 fake. Mirrors the exact statements emitted by the integration
// layer, and — critically — enforces the real UNIQUE index on dedupe_key so a
// duplicate plain INSERT throws the same constraint error as production D1.
// ---------------------------------------------------------------------------
function makeFakeD1() {
  const events = new Map(); // dedupe_key -> row (snake_case keys)
  const syncRuns = new Map(); // id -> row
  const mappings = []; // rows (snake_case keys)

  function norm(sql) {
    return String(sql).replace(/\s+/g, ' ').trim();
  }

  function parseInsertColumns(sql) {
    const open = sql.indexOf('(');
    const close = sql.indexOf(')', open);
    return sql
      .slice(open + 1, close)
      .split(',')
      .map((c) => c.trim());
  }

  function parseUpdate(sql) {
    const setStart = sql.indexOf('SET ') + 4;
    const whereIdx = sql.indexOf(' WHERE ');
    const setCols = sql
      .slice(setStart, whereIdx)
      .split(',')
      .map((part) => part.split('=')[0].trim());
    const tail = sql.slice(whereIdx + 7); // "col=? AND col2=?"
    const whereCols = tail
      .split(' AND ')
      .map((part) => part.split('=')[0].trim());
    return { setCols, whereCols };
  }

  function prepare(sqlRaw) {
    const sql = norm(sqlRaw);
    let binds = [];
    const stmt = {
      bind(...args) {
        binds = args;
        return stmt;
      },
      async run() {
        if (sql.startsWith('INSERT INTO integration_events')) {
          const cols = parseInsertColumns(sql);
          const row = {};
          cols.forEach((c, i) => {
            row[c] = binds[i];
          });
          if (events.has(row.dedupe_key)) {
            throw new Error(UNIQUE_MSG);
          }
          events.set(row.dedupe_key, row);
          return { success: true, meta: { changes: 1 } };
        }
        if (sql.startsWith('UPDATE integration_events')) {
          const { setCols, whereCols } = parseUpdate(sql);
          const wKey = binds[setCols.length];
          const row = events.get(wKey);
          if (row) {
            setCols.forEach((c, i) => {
              row[c] = binds[i];
            });
          }
          return { success: true, meta: { changes: row ? 1 : 0 } };
        }
        if (sql.startsWith('INSERT INTO sync_runs')) {
          const cols = parseInsertColumns(sql);
          const row = {};
          cols.forEach((c, i) => {
            row[c] = binds[i];
          });
          syncRuns.set(row.id, row);
          return { success: true, meta: { changes: 1 } };
        }
        if (sql.startsWith('UPDATE sync_runs')) {
          const { setCols, whereCols } = parseUpdate(sql);
          const wVal = binds[setCols.length];
          const row = syncRuns.get(wVal);
          if (row) {
            setCols.forEach((c, i) => {
              row[c] = binds[i];
            });
          }
          return { success: true, meta: { changes: row ? 1 : 0 } };
        }
        throw new Error('fake D1: unsupported run() statement: ' + sql);
      },
      async first() {
        if (sql.startsWith('SELECT * FROM integration_events WHERE dedupe_key')) {
          return events.get(binds[0]) ?? null;
        }
        if (sql.startsWith('SELECT * FROM sync_runs')) {
          const rows = [...syncRuns.values()]
            .filter((r) => r.account_id === binds[0])
            .sort((a, b) => (a.started_at < b.started_at ? 1 : -1));
          return rows[0] ?? null;
        }
        throw new Error('fake D1: unsupported first() statement: ' + sql);
      },
      async all() {
        if (sql.startsWith('SELECT * FROM integration_events WHERE provider')) {
          return { results: [...events.values()]
            .filter(
              (r) => r.provider === binds[0] && r.account_id === binds[1] && r.entity_key === binds[2],
            )
            .sort((a, b) => (a.received_at < b.received_at ? 1 : -1))
            .slice(0, 10) };
        }
        if (sql.startsWith('SELECT * FROM channel_manager_unit_mappings')) {
          return { results: mappings.filter((r) => r.account_id === binds[0]) };
        }
        throw new Error('fake D1: unsupported all() statement: ' + sql);
      },
    };
    return stmt;
  }

  return { events, syncRuns, mappings, prepare };
}

// ---------------------------------------------------------------------------
// recordIntegrationEvent — pure repository idempotency
// ---------------------------------------------------------------------------
function evRow(dedupeKey, status, localEntityId, error) {
  return {
    id: 'evt-' + dedupeKey,
    workspace: WORKSPACE,
    accountId: ACCOUNT,
    provider: 'beds24',
    eventType: 'reservation',
    externalId: 'ext-' + dedupeKey,
    entityKey: 'entity|beds24|' + ACCOUNT + '|reservation|ext-' + dedupeKey,
    dedupeKey,
    externalUpdatedAt: '2026-09-17T21:05:01Z',
    localEntityId: localEntityId ?? null,
    reconciliationStatus: status,
    metadata: JSON.stringify({ arrival: '2026-09-25', departure: '2026-09-27' }),
    error: error ?? null,
    receivedAt: '2026-09-19T00:52:36.000Z',
    processedAt: '2026-09-19T00:52:36.000Z',
  };
}

test('1. first integration event inserts normally', async () => {
  const d1 = makeFakeD1();
  const out = await recordIntegrationEvent(d1, evRow('k1', 'NEEDS_REVIEW', null, 'no mapping'));
  assert.equal(out.inserted, true);
  assert.equal(out.updated, false);
  assert.equal(d1.events.size, 1);
  assert.equal((await findEventByDedupe(d1, 'k1')).reconciliationStatus, 'NEEDS_REVIEW');
});

test('2. exact same dedupe event second time does not throw', async () => {
  const d1 = makeFakeD1();
  await recordIntegrationEvent(d1, evRow('k2', 'NEEDS_REVIEW', null, 'no mapping'));
  await assert.doesNotReject(() => recordIntegrationEvent(d1, evRow('k2', 'NEEDS_REVIEW', null, 'no mapping')));
});

test('3. exact duplicate does not create a second row', async () => {
  const d1 = makeFakeD1();
  for (let i = 0; i < 5; i++) {
    await recordIntegrationEvent(d1, evRow('k3', 'CONFLICT', 'RSV-1', 'overlaps RSV-9'));
  }
  assert.equal(d1.events.size, 1);
});

test('4. exact duplicate is not an error and is reported as already-processed', async () => {
  const d1 = makeFakeD1();
  await recordIntegrationEvent(d1, evRow('k4', 'NEEDS_REVIEW', null, 'no mapping'));
  const out = await recordIntegrationEvent(d1, evRow('k4', 'NEEDS_REVIEW', null, 'no mapping'));
  assert.equal(out.inserted, false);
  assert.equal(out.updated, false);
});

test('5. different logical event creates a separate row', async () => {
  const d1 = makeFakeD1();
  await recordIntegrationEvent(d1, evRow('k5a', 'NEEDS_REVIEW', null, 'a'));
  await recordIntegrationEvent(d1, evRow('k5b', 'CONFLICT', 'RSV-2', 'b'));
  assert.equal(d1.events.size, 2);
  assert.ok(d1.events.has('k5a'));
  assert.ok(d1.events.has('k5b'));
});

test('6. conflict stays conflict on replay', async () => {
  const d1 = makeFakeD1();
  await recordIntegrationEvent(d1, evRow('k6', 'CONFLICT', 'RSV-3', 'overlaps RSV-3'));
  await recordIntegrationEvent(d1, evRow('k6', 'CONFLICT', 'RSV-3', 'overlaps RSV-3'));
  assert.equal((await findEventByDedupe(d1, 'k6')).reconciliationStatus, 'CONFLICT');
});

test('7. needs_review stays needs_review on replay', async () => {
  const d1 = makeFakeD1();
  await recordIntegrationEvent(d1, evRow('k7', 'NEEDS_REVIEW', null, 'no mapping'));
  await recordIntegrationEvent(d1, evRow('k7', 'NEEDS_REVIEW', null, 'no mapping'));
  assert.equal((await findEventByDedupe(d1, 'k7')).reconciliationStatus, 'NEEDS_REVIEW');
});

test('8. low-level insert still throws on duplicate (constraint is real)', async () => {
  const d1 = makeFakeD1();
  await insertIntegrationEvent(d1, evRow('k8', 'NEW', null, null));
  await assert.rejects(
    () => insertIntegrationEvent(d1, evRow('k8', 'NEW', null, null)),
    /UNIQUE constraint failed: integration_events.dedupe_key/,
  );
});

test('9. outcome change updates the existing row instead of duplicating', async () => {
  const d1 = makeFakeD1();
  await recordIntegrationEvent(d1, evRow('k9', 'NEEDS_REVIEW', null, 'no mapping'));
  const out = await recordIntegrationEvent(
    d1,
    evRow('k9', 'NEW', 'RSV-CREATED', null),
  );
  assert.equal(out.updated, true);
  assert.equal(d1.events.size, 1);
  const row = await findEventByDedupe(d1, 'k9');
  assert.equal(row.reconciliationStatus, 'NEW');
  assert.equal(row.localEntityId, 'RSV-CREATED');
});

// ---------------------------------------------------------------------------
// runBeds24Sync — the production incident path
// ---------------------------------------------------------------------------
function baseState() {
  return {
    units: Array.from({ length: 8 }, (_, i) => ({
      id: 'v' + (i + 1),
      name: 'Vila ' + String(i + 1).padStart(2, '0'),
      capacity: 4,
      rate: 1500000,
      clean: 'Siap',
    })),
    bookings: [],
    payments: [],
    tasks: [],
    blocks: [],
    expenses: [],
    guests: [],
    audit: [],
    settings: { name: 'Vila Eight', checkin: '14:00', checkout: '12:00' },
  };
}

function canonicalMapped() {
  return {
    provider: 'beds24',
    externalId: '93288822',
    externalUnitId: '730760',
    externalChannel: 'Direct',
    arrival: '2026-09-25',
    departure: '2026-09-27',
    guestName: 'Putu Mertaningsih',
    guestPhone: '081234567890',
    adults: 2,
    children: 0,
    status: 'CONFIRMED',
    price: 3000000,
    externalUpdatedAt: '2026-09-17T21:05:01Z',
  };
}

function canonicalUnmappedCancellation() {
  return {
    provider: 'beds24',
    externalId: '93184767',
    externalUnitId: '999999',
    externalChannel: 'Direct',
    arrival: '2026-09-15',
    departure: '2026-09-16',
    guestName: 'Unknown Guest',
    adults: 1,
    children: 0,
    status: 'CANCELLED',
    price: 0,
    externalUpdatedAt: '2026-09-15T23:04:36Z',
  };
}

function makeHarness() {
  const d1 = makeFakeD1();
  d1.mappings.push({
    id: 'map-1',
    account_id: ACCOUNT,
    workspace: WORKSPACE,
    local_unit_id: 'v1',
    external_property_id: 'prop-1',
    external_unit_id: '730760',
    confirmed: 1,
    created_at: '2026-09-19T00:00:00.000Z',
    updated_at: '2026-09-19T00:00:00.000Z',
  });
  const reservations = [canonicalMapped(), canonicalUnmappedCancellation()];
  const adapter = {
    sync: async () => ({ reservations, cursor: 'cur-1', receivedCount: reservations.length }),
  };
  let store = { version: 1, state: baseState() };
  const deps = {
    adapter,
    db: d1,
    workspace: WORKSPACE,
    accountId: ACCOUNT,
    provider: 'beds24',
    loadWorkspace: async () => ({ version: store.version, state: structuredClone(store.state) }),
    saveWorkspace: async (version, state) => {
      store = { version: version + 1, state };
      return true;
    },
  };
  return { d1, deps, getStore: () => store };
}

test('10. sync run 1: one booking created, one needs_review, zero errors', async () => {
  const { d1, deps } = makeHarness();
  const out = await runBeds24Sync('initial', deps);
  assert.equal(out.run.errorCount, 0, 'no errors on first run');
  assert.equal(out.run.lastError, null);
  assert.equal(out.applied.created, 1);
  assert.equal(out.applied.needsReview, 1);
  assert.equal(d1.events.size, 2);
  const mappedEvent = await findEventByDedupe(
    d1,
    buildEventKey({
      provider: 'beds24',
      accountId: ACCOUNT,
      entityType: 'reservation',
      externalId: '93288822',
      externalUpdatedAt: '2026-09-17T21:05:01Z',
    }),
  );
  assert.equal(mappedEvent.reconciliationStatus, 'NEW');
  assert.ok(mappedEvent.localEntityId, 'created booking id must be recorded');
});

test('11. sync run 2 (identical replay): zero errors, no duplicate rows', async () => {
  const { d1, deps } = makeHarness();
  await runBeds24Sync('initial', deps);
  const out = await runBeds24Sync('incremental', deps);
  assert.equal(out.run.errorCount, 0, 'replay must not produce errors');
  assert.equal(out.run.lastError, null);
  assert.equal(d1.events.size, 2, 'no duplicate event rows');
  assert.equal(out.applied.created, 0);
});

test('12. unmapped cancellation keeps NEEDS_REVIEW across runs', async () => {
  const { d1, deps } = makeHarness();
  await runBeds24Sync('initial', deps);
  await runBeds24Sync('incremental', deps);
  const ev = await findEventByDedupe(
    d1,
    buildEventKey({
      provider: 'beds24',
      accountId: ACCOUNT,
      entityType: 'reservation',
      externalId: '93184767',
      externalUpdatedAt: '2026-09-15T23:04:36Z',
    }),
  );
  assert.equal(ev.reconciliationStatus, 'NEEDS_REVIEW');
});

test('13. repeated sync stays idempotent over many runs', async () => {
  const { d1, deps } = makeHarness();
  for (let i = 0; i < 6; i++) {
    const out = await runBeds24Sync(i === 0 ? 'initial' : 'incremental', deps);
    assert.equal(out.run.errorCount, 0, 'run ' + i + ' must be error-free');
  }
  assert.equal(d1.events.size, 2);
});

// ---------------------------------------------------------------------------
// dedupe key collision safety
// ---------------------------------------------------------------------------
test('14. different externalId produces different event key', () => {
  const a = buildEventKey({
    provider: 'beds24',
    accountId: ACCOUNT,
    entityType: 'reservation',
    externalId: '111',
    externalUpdatedAt: '2026-09-01T00:00:00Z',
  });
  const b = buildEventKey({
    provider: 'beds24',
    accountId: ACCOUNT,
    entityType: 'reservation',
    externalId: '222',
    externalUpdatedAt: '2026-09-01T00:00:00Z',
  });
  assert.notEqual(a, b);
});

test('15. same externalId, newer updatedAt produces different event key', () => {
  const a = buildEventKey({
    provider: 'beds24',
    accountId: ACCOUNT,
    entityType: 'reservation',
    externalId: '111',
    externalUpdatedAt: '2026-09-01T00:00:00Z',
  });
  const b = buildEventKey({
    provider: 'beds24',
    accountId: ACCOUNT,
    entityType: 'reservation',
    externalId: '111',
    externalUpdatedAt: '2026-09-02T00:00:00Z',
  });
  assert.notEqual(a, b);
});

test('16. same logical event always produces the same key (deterministic)', () => {
  const input = {
    provider: 'beds24',
    accountId: ACCOUNT,
    entityType: 'reservation',
    externalId: '111',
    externalUpdatedAt: '2026-09-01T00:00:00Z',
  };
  assert.equal(buildEventKey(input), buildEventKey({ ...input }));
});

await runAll();
