import assert from 'node:assert/strict';

import { Beds24Client } from '../lib/integrations/beds24/client.ts';
import {
  translateHttpStatus, translateNetworkError, translateTimeoutError,
} from '../lib/integrations/beds24/errors.ts';
import { ERROR_CATEGORY } from '../lib/integrations/errors.ts';
import { mapBeds24Booking, mapBeds24Status, resolveChannel, mapBeds24Properties } from '../lib/integrations/beds24/mapper.ts';
import { buildInitialSyncQuery, buildIncrementalSyncQuery, toUrlParams } from '../lib/integrations/beds24/query.ts';
import { applyCanonicalReservation } from '../lib/integrations/beds24/apply.ts';
import { createUnitMapping } from '../lib/integrations/unit-mapping.ts';

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
    externalUnitId: '14000:316000',
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
  const mockFetch = async (url) => {
    pages++;
    const u = String(url);
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
  assert.equal(r.value.externalUnitId, '14000:316000');
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

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);