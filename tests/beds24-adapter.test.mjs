import assert from 'node:assert/strict';

import { Beds24Client } from '../lib/integrations/beds24/client.ts';
import {
  translateHttpStatus, translateNetworkError, translateTimeoutError,
} from '../lib/integrations/beds24/errors.ts';
import { ERROR_CATEGORY } from '../lib/integrations/errors.ts';
import {
  mapBeds24Booking,
  mapBeds24Status,
  resolveChannel,
  mapBeds24Properties,
} from '../lib/integrations/beds24/mapper.ts';
import { Beds24ListWrapper } from '../lib/integrations/beds24/types.ts';
import { buildInitialSyncQuery, buildIncrementalSyncQuery, toUrlParams } from '../lib/integrations/beds24/query.ts';
import { applyCanonicalReservation } from '../lib/integrations/beds24/apply.ts';
import {
  Beds24Adapter,
  buildCursor,
} from '../lib/integrations/beds24/adapter.ts';
import { decideMappingSave } from '../lib/integrations/beds24/mapping.ts';
import {
  createUnitMapping,
  findMappingByExternal,
} from '../lib/integrations/unit-mapping.ts';

let passed = 0, failed = 0;
function test(name, fn) { try { fn(); console.log('PASS:', name); passed++; } catch (e) { console.error('FAIL:', name, '-', e?.message ?? e); failed++; } }
async function testAsync(name, fn) { try { await fn(); console.log('PASS:', name); passed++; } catch (e) { console.error('FAIL:', name, '-', e?.message ?? e); failed++; } }

function makeMapping(over = {}) {
  return createUnitMapping({
    id: 'm1', accountId: 'acc1', workspace: 'live:u1',
    localUnitId: 'v1', externalPropertyId: '14000', externalUnitId: '316000',
    confirmed: true, now: '2025-01-01T00:00:00.000Z', ...over,
  });
}

function makeState(over = {}) {
  return {
    units: [{ id: 'v1', name: 'Vila 1', capacity: 4, rate: 1500000, clean: 'Siap' }],
    bookings: [], payments: [], tasks: [], blocks: [], expenses: [],
    audit: [], settings: { name: 'Test', checkin: '14:00', checkout: '12:00' },
    ...over,
  };
}

function makeCanonical(over = {}) {
  return {
    provider: 'beds24', externalId: '30600000',
    externalUnitId: '316000',
    externalPropertyId: '14000',
    arrival: '2026-10-12', departure: '2026-10-15',
    guestName: 'Example Guest', adults: 4, children: 0,
    status: 'CONFIRMED', price: 3031.6,
    externalChannel: 'Direct', externalUpdatedAt: '2026-09-16T16:51:43Z',
    ...over,
  };
}

function makeBeds24BookingJson(over = {}) {
  return {
    id: 30600000, propertyId: 14000, roomId: 316000,
    status: 'request', arrival: '2026-10-12', departure: '2026-10-15',
    numAdult: 4, numChild: 0,
    firstName: '', lastName: 'Example Guest',
    email: 'guest@example.com', phone: '', mobile: '',
    apiSource: 'Direct', apiSourceId: 0,
    bookingTime: '2026-09-16T16:51:02Z',
    modifiedTime: '2026-09-16T16:51:43Z',
    price: 3031.6,
    ...over,
  };
}

function makeMockClient({ normalBookings = [], cancelledBookings = [] } = {}) {
  const calls = [];
  const mockFetch = async (url) => {
    const u = String(url);
    calls.push(u);
    const isCancelled = u.includes('status=cancelled');
    const data = isCancelled ? cancelledBookings : normalBookings;
    const body = {
      success: true,
      count: data.length,
      pages: { nextPageExists: false, nextPageLink: null },
      data,
    };
    return new Response(JSON.stringify(body), { status: 200 });
  };
  const client = new Beds24Client({ fetchImpl: mockFetch });
  return { client, calls };
}

function makeAdapter({ normalBookings = [], cancelledBookings = [], now } = {}) {
  const { client, calls } = makeMockClient({ normalBookings, cancelledBookings });
  const adapter = new Beds24Adapter(
    { accountId: 'acc1', workspace: 'live:u1' },
    {
      client,
      tokenProvider: () => 'TEST_TOKEN',
      isConfiguredFn: () => true,
      nowFn: now ? () => now : undefined,
    },
  );
  return { adapter, calls };
}
// ===== auth/error =====
test('errors: 401 -> auth', () => { assert.equal(translateHttpStatus(401, {}).category, ERROR_CATEGORY.authentication); });
test('errors: 403 -> auth', () => { assert.equal(translateHttpStatus(403, {}).category, ERROR_CATEGORY.authentication); });
test('errors: 429 -> rate', () => { assert.equal(translateHttpStatus(429, {}).category, ERROR_CATEGORY.rateLimited); });
test('errors: 500 -> unavailable', () => { assert.equal(translateHttpStatus(500, {}).category, ERROR_CATEGORY.providerUnavailable); });
test('errors: 400 -> invalid', () => { assert.equal(translateHttpStatus(400, {}).category, ERROR_CATEGORY.invalidResponse); });
test('errors: network wrap', () => { assert.equal(translateNetworkError(new Error('x')).category, ERROR_CATEGORY.network); });
test('errors: timeout wrap', () => { assert.equal(translateTimeoutError().category, ERROR_CATEGORY.network); });

// ===== client =====
await testAsync('client: header name is token, not Authorization', async () => {
  let headersSeen = null;
  const mockFetch = async (_url, opts) => { headersSeen = opts.headers; return new Response('{}', { status: 200 }); };
  const c = new Beds24Client({ fetchImpl: mockFetch });
  await c.request({ path: '/x', token: 'TOKEN' });
  assert.ok(headersSeen.token === 'TOKEN');
  assert.ok(!headersSeen.Authorization);
});

await testAsync('client: 401 throws auth, no retry', async () => {
  let calls = 0;
  const mockFetch = async () => { calls++; return new Response('{}', { status: 401 }); };
  const c = new Beds24Client({ fetchImpl: mockFetch });
  await assert.rejects(() => c.request({ path: '/x', token: 'T' }), (e) => e.category === ERROR_CATEGORY.authentication);
  assert.equal(calls, 1);
});

await testAsync('client: 429 retried', async () => {
  let calls = 0;
  const mockFetch = async () => { calls++; return new Response('{}', { status: 429 }); };
  const c = new Beds24Client({ fetchImpl: mockFetch });
  await assert.rejects(() => c.request({ path: '/x', token: 'T' }), (e) => e.category === ERROR_CATEGORY.rateLimited);
  assert.ok(calls > 1);
});

await testAsync('client: parses rate limit headers', async () => {
  const mockFetch = async () => new Response('{}', {
    status: 200,
    headers: { 'x-five-min-limit-remaining': '87', 'x-request-cost': '1' },
  });
  const c = new Beds24Client({ fetchImpl: mockFetch });
  await c.request({ path: '/x', token: 'T' });
  assert.equal(c.lastRateLimit.remaining, 87);
  assert.equal(c.lastRateLimit.requestCost, 1);
});

await testAsync('client: follows nextPageLink only on trusted origin', async () => {
  let pages = 0;
  const mockFetch = async () => {
    pages++;
    if (pages === 1) {
      return new Response(JSON.stringify({
        success: true, data: [{ n: 1 }],
        pages: { nextPageExists: true, nextPageLink: 'https://api.beds24.com/v2/bookings?page=2' },
      }), { status: 200 });
    }
    return new Response(JSON.stringify({ success: true, data: [{ n: 2 }], pages: { nextPageExists: false } }), { status: 200 });
  };
  const c = new Beds24Client({ fetchImpl: mockFetch });
  const items = await c.requestAllPages('/bookings', {}, (b) => b.data ?? [], 'TEST_TOKEN');
  assert.equal(items.length, 2);
  assert.equal(pages, 2);
});

await testAsync('client: rejects untrusted nextPageLink', async () => {
  const mockFetch = async () => new Response(JSON.stringify({
    success: true, data: [{ n: 1 }],
    pages: { nextPageExists: true, nextPageLink: 'https://evil.com/x' },
  }), { status: 200 });
  const c = new Beds24Client({ fetchImpl: mockFetch });
  const items = await c.requestAllPages('/bookings', {}, (b) => b.data ?? [], 'TEST_TOKEN');
  assert.equal(items.length, 1);
});

await testAsync('client: malformed JSON -> invalid_response', async () => {
  const mockFetch = async () => new Response('not json', { status: 200 });
  const c = new Beds24Client({ fetchImpl: mockFetch });
  await assert.rejects(() => c.request({ path: '/x', token: 'T' }), (e) => e.category === ERROR_CATEGORY.invalidResponse);
});

// ===== mapper =====
test('mapper: status mapping', () => {
  assert.equal(mapBeds24Status('confirmed'), 'CONFIRMED');
  assert.equal(mapBeds24Status('cancelled'), 'CANCELLED');
  assert.equal(mapBeds24Status('request'), 'PENDING');
  assert.equal(mapBeds24Status('new'), 'PENDING');
  assert.equal(mapBeds24Status('inquiry'), 'PENDING');
  assert.equal(mapBeds24Status('black'), 'CANCELLED');
  assert.equal(mapBeds24Status('unknown-status'), 'UNKNOWN');
});

test('mapper: channel from apiSourceId', () => {
  assert.equal(resolveChannel(19, null), 'Booking.com');
  assert.equal(resolveChannel(46, null), 'Airbnb');
  assert.equal(resolveChannel(0, null), 'Direct');
  assert.equal(resolveChannel(999, 'Custom'), 'Custom');
  assert.equal(resolveChannel(999, ''), 'Unknown');
});

test('mapper: full booking mapping', () => {
  const r = mapBeds24Booking(makeBeds24BookingJson());
  assert.ok(r.ok);
  assert.equal(r.value.externalId, '30600000');
  assert.equal(r.value.externalUnitId, '316000');
  assert.equal(r.value.externalPropertyId, '14000');
  assert.equal(r.value.arrival, '2026-10-12');
  assert.equal(r.value.departure, '2026-10-15');
  assert.equal(r.value.guestName, 'Example Guest');
  assert.equal(r.value.guestEmail, 'guest@example.com');
  assert.equal(r.value.adults, 4);
  assert.equal(r.value.children, 0);
  assert.equal(r.value.status, 'PENDING');
  assert.equal(r.value.externalChannel, 'Direct');
  assert.equal(r.value.externalUpdatedAt, '2026-09-16T16:51:43Z');
});

test('mapper: Booking.com source fixture', () => {
  const r = mapBeds24Booking(makeBeds24BookingJson({ apiSourceId: 19, apiSource: 'Booking.com' }));
  assert.ok(r.ok);
  assert.equal(r.value.externalChannel, 'Booking.com');
});

test('mapper: Airbnb source fixture', () => {
  const r = mapBeds24Booking(makeBeds24BookingJson({ apiSourceId: 46, apiSource: 'Airbnb' }));
  assert.ok(r.ok);
  assert.equal(r.value.externalChannel, 'Airbnb');
});

test('mapper: invalid booking returns error', () => {
  const r = mapBeds24Booking({ id: 1 });
  assert.ok(!r.ok);
});

test('mapper: property + room units', () => {
  const { properties, units } = mapBeds24Properties([
    { id: 100, name: 'Villa A', roomTypes: [{ id: 200, name: 'Room 1' }, { id: 201, name: 'Room 2' }] },
  ]);
  assert.equal(properties.length, 1);
  assert.equal(properties[0].externalId, '100');
  assert.equal(units.length, 2);
  assert.equal(units[0].externalId, '200');
  assert.equal(units[0].propertyExternalId, '100');
});

// ===== query =====
test('query: initial sync uses arrivalFrom/arrivalTo', () => {
  const q = buildInitialSyncQuery({ pastDays: 30, futureDays: 365 });
  assert.ok(q.arrivalFrom);
  assert.ok(q.arrivalTo);
  assert.ok(q.arrivalFrom < q.arrivalTo);
});

test('query: incremental without cursor falls back to initial', () => {
  const q = buildIncrementalSyncQuery(null);
  assert.ok(q.arrivalFrom);
});

test('query: toUrlParams joins status list', () => {
  const p = toUrlParams({ status: ['confirmed', 'request'], arrivalFrom: '2025-01-01' });
  assert.equal(p.status, 'confirmed,request');
  assert.equal(p.arrivalFrom, '2025-01-01');
});

// ===== apply =====
test('apply: creates new booking on NEW', () => {
  const r = applyCanonicalReservation(makeState(), makeCanonical(), makeMapping(), null);
  assert.ok(r.ok);
  assert.equal(r.action, 'created');
  assert.equal(r.state.bookings.length, 1);
  const b = r.state.bookings[0];
  assert.equal(b.unit, 'v1');
  assert.equal(b.guest, 'Example Guest');
  assert.equal(b.start, '2026-10-12');
  assert.equal(b.end, '2026-10-15');
  assert.equal(b.guests, 4);
  assert.equal(b.channel, 'Direct');
  assert.equal(b.total, 3031.6);
});

test('apply: no mapping -> no_mapping', () => {
  const r = applyCanonicalReservation(makeState(), makeCanonical(), null, null);
  assert.ok(!r.ok);
  assert.equal(r.reason, 'no_mapping');
});

test('apply: unknown unit -> unknown_unit', () => {
  const r = applyCanonicalReservation(makeState(), makeCanonical(), makeMapping({ localUnitId: 'v99' }), null);
  assert.ok(!r.ok);
  assert.equal(r.reason, 'unknown_unit');
});

test('apply: conflict with existing booking', () => {
  const s = makeState({
    bookings: [{ id: 'B1', unit: 'v1', guest: 'X', phone: '', start: '2026-10-13', end: '2026-10-16', guests: 2, channel: 'Direct', status: 'Confirmed', total: 100, note: '', created: '' }],
  });
  const r = applyCanonicalReservation(s, makeCanonical(), makeMapping(), null);
  assert.ok(!r.ok);
  assert.equal(r.reason, 'conflict');
});

test('apply: update reuses same local id', () => {
  const s = makeState({
    bookings: [{ id: 'B1', unit: 'v1', guest: 'Old', phone: '', start: '2026-10-12', end: '2026-10-15', guests: 2, channel: 'Airbnb', status: 'Confirmed', total: 100, note: 'PRESERVE_ME', created: '' }],
  });
  const r = applyCanonicalReservation(s, makeCanonical({ guestName: 'New Guest', externalChannel: 'Airbnb' }), makeMapping(), 'B1');
  assert.ok(r.ok);
  assert.equal(r.action, 'updated');
  assert.equal(r.localEntityId, 'B1');
  assert.equal(r.state.bookings[0].id, 'B1');
  assert.equal(r.state.bookings[0].guest, 'New Guest');
  // Field ownership: note preserved
  assert.equal(r.state.bookings[0].note, 'PRESERVE_ME');
});

test('apply: cancellation preserves history and internal data', () => {
  const s = makeState({
    bookings: [{ id: 'B1', unit: 'v1', guest: 'X', phone: '', start: '2026-10-12', end: '2026-10-15', guests: 2, channel: 'Direct', status: 'Confirmed', total: 100, note: 'KEEP', created: '' }],
  });
  const r = applyCanonicalReservation(s, makeCanonical({ status: 'CANCELLED' }), makeMapping(), 'B1');
  assert.ok(r.ok);
  assert.equal(r.action, 'cancelled');
  assert.equal(r.state.bookings[0].status, 'Cancelled');
  assert.equal(r.state.bookings[0].note, 'KEEP');
});

test('apply: unchanged when nothing differs', () => {
  const s = makeState({
    bookings: [{ id: 'B1', unit: 'v1', guest: 'Example Guest', phone: '', start: '2026-10-12', end: '2026-10-15', guests: 4, channel: 'Direct', status: 'Confirmed', total: 3031.6, note: 'N', created: '' }],
  });
  const r = applyCanonicalReservation(s, makeCanonical(), makeMapping(), 'B1');
  assert.ok(r.ok);
  assert.equal(r.action, 'unchanged');
});

test('apply: no token leak in error objects', async () => {
  const mockFetch = async () => new Response('{"error":"bad"}', { status: 401 });
  const c = new Beds24Client({ fetchImpl: mockFetch });
  try { await c.request({ path: '/x', token: 'SECRET-XYZ' }); assert.fail(); }
  catch (e) {
    const s = JSON.stringify({ msg: e.message, detail: e.safeDetail });
    assert.ok(!s.includes('SECRET-XYZ'));
  }
});
// ===== Beds24ListWrapper — real API shape (nextPageLink: null) =====
test('list-wrapper: accepts nextPageLink: null', () => {
  const body = {
    success: true,
    type: 'property',
    count: 1,
    pages: { nextPageExists: false, nextPageLink: null },
    data: [],
  };
  const r = Beds24ListWrapper.safeParse(body);
  assert.ok(r.success, `expected success, got ${JSON.stringify(r.error)}`);
  assert.equal(r.data.pages?.nextPageLink, null);
});

test('list-wrapper: real-shaped property response parses', () => {
  const body = {
    success: true,
    type: 'property',
    count: 2,
    pages: { nextPageExists: false, nextPageLink: null },
    data: [
      { id: 100, name: 'Villa A', roomTypes: [{ id: 200, name: 'Room 1' }] },
      { id: 101, name: 'Villa B', roomTypes: [{ id: 201, name: 'Room 2' }] },
    ],
  };
  const r = Beds24ListWrapper.safeParse(body);
  assert.ok(r.success, `expected success, got ${JSON.stringify(r.error)}`);
  assert.equal(r.data.count, 2);
  assert.equal(r.data.data.length, 2);
});

test('mapper: mapBeds24Properties returns properties + units from real-shaped response', () => {
  const body = {
    success: true,
    count: 2,
    pages: { nextPageExists: false, nextPageLink: null },
    data: [
      { id: 100, name: 'Villa A', roomTypes: [{ id: 200, name: 'Room 1' }, { id: 201, name: 'Room 2' }] },
      { id: 101, name: 'Villa B', roomTypes: [{ id: 202, name: 'Room 3' }] },
    ],
  };
  const parsed = Beds24ListWrapper.safeParse(body);
  assert.ok(parsed.success);
  const { properties, units } = mapBeds24Properties(parsed.data.data ?? []);
  assert.equal(properties.length, 2);
  assert.equal(units.length, 3);
  assert.equal(properties[0].externalId, '100');
  assert.equal(units[0].externalId, '200');
  assert.equal(units[0].propertyExternalId, '100');
});
// ===== mapping-save idempotency =====
function makeUnitMapping(over = {}) {
  return createUnitMapping({
    id: 'map-fixed-001',
    accountId: 'acc1',
    workspace: 'live:u1',
    localUnitId: 'v1',
    externalPropertyId: '354434',
    externalUnitId: '730761',
    confirmed: true,
    now: '2025-01-01T00:00:00.000Z',
    ...over,
  });
}

test('mapping-save: first creation succeeds', () => {
  const d = decideMappingSave([], {
    localUnitId: 'v1',
    externalPropertyId: '354434',
    externalUnitId: '730761',
  });
  assert.equal(d.kind, 'create');
});

test('mapping-save: exact retry returns unchanged (idempotent)', () => {
  const existing = [makeUnitMapping()];
  const d = decideMappingSave(existing, {
    localUnitId: 'v1',
    externalPropertyId: '354434',
    externalUnitId: '730761',
  });
  assert.equal(d.kind, 'unchanged');
  if (d.kind === 'unchanged') {
    assert.equal(d.mapping.id, 'map-fixed-001', 'must reuse existing id, no new id');
  }
});

test('mapping-save: external unit -> different local unit returns conflict', () => {
  const existing = [makeUnitMapping({ localUnitId: 'v1' })];
  const d = decideMappingSave(existing, {
    localUnitId: 'v2',
    externalPropertyId: '354434',
    externalUnitId: '730761',
  });
  assert.equal(d.kind, 'conflict-external');
});

test('mapping-save: local unit -> different external unit returns conflict', () => {
  const existing = [makeUnitMapping()];
  const d = decideMappingSave(existing, {
    localUnitId: 'v1',
    externalPropertyId: '354434',
    externalUnitId: '999999',
  });
  assert.equal(d.kind, 'conflict-local');
});

test('mapping-save: idempotency simulation — create then unchanged, no duplicate id', () => {
  const d1 = decideMappingSave([], {
    localUnitId: 'v1',
    externalPropertyId: '354434',
    externalUnitId: '730761',
  });
  assert.equal(d1.kind, 'create');

  const persisted = [makeUnitMapping()];

  const d2 = decideMappingSave(persisted, {
    localUnitId: 'v1',
    externalPropertyId: '354434',
    externalUnitId: '730761',
  });
  assert.equal(d2.kind, 'unchanged');
  if (d2.kind === 'unchanged') {
    assert.equal(d2.mapping.id, persisted[0].id);
  }
});
// ===== mapper unit identity consistency (Gate 4 fix) =====
test('mapper: booking externalUnitId equals room ID (not propertyId:roomId)', () => {
  const r = mapBeds24Booking(makeBeds24BookingJson());
  assert.ok(r.ok);
  assert.equal(r.value.externalUnitId, '316000');
  assert.equal(r.value.externalPropertyId, '14000');
});

test('mapper: property/unit mapper and booking mapper use same externalUnitId convention', () => {
  const booking = mapBeds24Booking(makeBeds24BookingJson());
  assert.ok(booking.ok);
  const { units } = mapBeds24Properties([
    { id: 14000, name: 'Prop', roomTypes: [{ id: 316000, name: 'Room' }] },
  ]);
  assert.equal(units.length, 1);
  assert.equal(units[0].externalId, '316000');
  assert.equal(booking.value.externalUnitId, units[0].externalId);
});

test('mapper: confirmed mapping resolves correctly via externalUnitId', () => {
  const m = makeMapping({
    localUnitId: 'v1',
    externalPropertyId: '354434',
    externalUnitId: '730761',
  });
  const booking = mapBeds24Booking(
    makeBeds24BookingJson({ propertyId: 354434, roomId: 730761 }),
  );
  assert.ok(booking.ok);
  const found = findMappingByExternal([m], booking.value.externalUnitId);
  assert.ok(found, 'mapping must resolve using externalUnitId alone');
  assert.equal(found.localUnitId, 'v1');
});

test('mapper: initial NEW reservation applies to local unit v1', () => {
  const m = makeMapping({
    localUnitId: 'v1',
    externalPropertyId: '354434',
    externalUnitId: '730761',
  });
  const booking = mapBeds24Booking(
    makeBeds24BookingJson({
      propertyId: 354434,
      roomId: 730761,
      arrival: '2026-10-12',
      departure: '2026-10-15',
      numAdult: 2,
      numChild: 0,
      status: 'confirmed',
    }),
  );
  assert.ok(booking.ok);
  const state = makeState();
  const result = applyCanonicalReservation(state, booking.value, m, null);
  assert.ok(result.ok, `expected ok, got ${JSON.stringify(result)}`);
  assert.equal(result.action, 'created');
  assert.equal(result.state.bookings[0].unit, 'v1');
});
// ===== Gate 7: cancellation polling =====
await testAsync('sync: normal query returns active booking', async () => {
  const active = makeBeds24BookingJson({ id: 1, status: 'confirmed' });
  const { adapter } = makeAdapter({ normalBookings: [active] });
  const r = await adapter.sync({});
  assert.equal(r.reservations.length, 1);
  assert.equal(r.reservations[0].status, 'CONFIRMED');
});

await testAsync('sync: cancelled query is also executed in fallback mode', async () => {
  const { adapter, calls } = makeAdapter({});
  await adapter.sync({});
  const hasCancelledQuery = calls.some((u) => u.includes('status=cancelled'));
  const hasNormalQuery = calls.some((u) => !u.includes('status=cancelled'));
  assert.ok(hasNormalQuery, 'normal query must run');
  assert.ok(hasCancelledQuery, 'cancelled query must also run');
});

await testAsync('sync: cancelled booking absent from normal but present in cancelled query is returned', async () => {
  const cancelled = makeBeds24BookingJson({
    id: 93184767,
    status: 'cancelled',
    propertyId: 354434,
    roomId: 730761,
  });
  const { adapter } = makeAdapter({ cancelledBookings: [cancelled] });
  const r = await adapter.sync({});
  assert.equal(r.reservations.length, 1);
  assert.equal(r.reservations[0].status, 'CANCELLED');
  assert.equal(r.reservations[0].externalId, '93184767');
});

await testAsync('sync: duplicate booking returned by both queries is deduplicated by id', async () => {
  const b1 = makeBeds24BookingJson({ id: 555, status: 'confirmed' });
  const b2 = makeBeds24BookingJson({ id: 555, status: 'confirmed' });
  const { adapter } = makeAdapter({
    normalBookings: [b1],
    cancelledBookings: [b2],
  });
  const r = await adapter.sync({});
  assert.equal(r.reservations.length, 1);
});

await testAsync('sync: cancelled version wins on id collision', async () => {
  const confirmed = makeBeds24BookingJson({ id: 777, status: 'confirmed' });
  const cancelled = makeBeds24BookingJson({ id: 777, status: 'cancelled' });
  const { adapter } = makeAdapter({
    normalBookings: [confirmed],
    cancelledBookings: [cancelled],
  });
  const r = await adapter.sync({});
  assert.equal(r.reservations.length, 1);
  assert.equal(r.reservations[0].status, 'CANCELLED');
});

// ===== Gate 7: cursor safety =====
test('cursor: empty result preserves previous lastModifiedAt', () => {
  const prev = { lastModifiedAt: '2026-01-01T00:00:00Z' };
  const json = buildCursor(prev, [], '2026-06-01T00:00:00Z');
  const parsed = JSON.parse(json);
  assert.equal(parsed.lastModifiedAt, '2026-01-01T00:00:00Z');
  assert.equal(parsed.syncedAt, '2026-06-01T00:00:00Z');
  assert.equal(parsed.mode, 'fallback-bounded-polling');
});

test('cursor: no previous and empty result → lastModifiedAt stays null (never now)', () => {
  const json = buildCursor(null, [], '2026-06-01T00:00:00Z');
  const parsed = JSON.parse(json);
  assert.equal(parsed.lastModifiedAt, null);
  assert.equal(parsed.syncedAt, '2026-06-01T00:00:00Z');
});

test('cursor: non-empty advances to highest externalUpdatedAt', () => {
  const prev = { lastModifiedAt: '2026-01-01T00:00:00Z' };
  const json = buildCursor(
    prev,
    [
      { externalUpdatedAt: '2026-03-01T00:00:00Z' },
      { externalUpdatedAt: '2026-05-15T12:00:00Z' },
      { externalUpdatedAt: '2026-02-20T00:00:00Z' },
    ],
    '2026-06-01T00:00:00Z',
  );
  const parsed = JSON.parse(json);
  assert.equal(parsed.lastModifiedAt, '2026-05-15T12:00:00Z');
});

// ===== Gate 7: no regression =====
await testAsync('sync regression: initial sync still returns active + cancelled', async () => {
  const active = makeBeds24BookingJson({ id: 1, status: 'confirmed' });
  const cancelled = makeBeds24BookingJson({ id: 2, status: 'cancelled' });
  const { adapter } = makeAdapter({
    normalBookings: [active],
    cancelledBookings: [cancelled],
  });
  const r = await adapter.sync({ cursor: null });
  assert.equal(r.reservations.length, 2);
  const statuses = r.reservations.map((x) => x.status).sort();
  assert.deepEqual(statuses, ['CANCELLED', 'CONFIRMED']);
});

await testAsync('sync regression: repeat sync is idempotent (same reservations returned)', async () => {
  const active = makeBeds24BookingJson({ id: 1, status: 'confirmed' });
  const { adapter } = makeAdapter({ normalBookings: [active] });
  const r1 = await adapter.sync({});
  const r2 = await adapter.sync({ cursor: r1.cursor });
  assert.equal(r1.reservations.length, 1);
  assert.equal(r2.reservations.length, 1);
  assert.equal(r1.reservations[0].externalId, r2.reservations[0].externalId);
});

// ===== Gate 7: cancellation → local booking =====
test('apply: Beds24 cancellation maps to existing local booking and does not create new one', () => {
  const m = makeMapping({
    localUnitId: 'v1',
    externalPropertyId: '354434',
    externalUnitId: '730761',
  });
  const existingState = makeState({
    bookings: [
      {
        id: 'B1',
        unit: 'v1',
        guest: 'X',
        phone: '',
        start: '2026-10-12',
        end: '2026-10-15',
        guests: 2,
        channel: 'Direct',
        status: 'Confirmed',
        total: 100,
        note: 'PRESERVE',
        created: '',
      },
    ],
  });
  const cancelled = makeCanonical({
    status: 'CANCELLED',
    externalUnitId: '730761',
    externalPropertyId: '354434',
    externalId: '93184767',
  });
  const r = applyCanonicalReservation(existingState, cancelled, m, 'B1');
  assert.ok(r.ok, `expected ok, got ${JSON.stringify(r)}`);
  assert.equal(r.action, 'cancelled');
  assert.equal(r.localEntityId, 'B1');
  assert.equal(r.state.bookings.length, 1, 'must not create a second booking');
  assert.equal(r.state.bookings[0].status, 'Cancelled');
  assert.equal(r.state.bookings[0].note, 'PRESERVE');
});
console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);