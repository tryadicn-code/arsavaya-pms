import assert from 'node:assert/strict';
import test from 'node:test';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {
  arrivalsToday, inHouse, departuresToday, pendingReservations, guestValue,
  getPrimaryOperatorAction, getDestructiveOperatorActions, getSecondaryOperatorActions,
  reservationStatusLabel, reservationStatusTone, operatorActionLabel,
  RESERVATION_FILTER_GROUPS, statusesForFilter, filterGroupCoverage, matchesFilterGroup,
  formatDateWITA, formatDateTimeWITA, statusSourceLabel, GUEST_VALUE_STATUSES,
} from '../lib/operational.ts';
import {BOOKING_STATUSES, operatorTransitions, transitionBooking} from '../lib/booking-status.ts';

const TODAY = '2026-09-19';
const mk = (over) => ({id: 'RSV-1', unit: 'v1', guest: 'Test Tamu', phone: '', start: TODAY, end: '2026-09-21', guests: 2, channel: 'Langsung', status: 'Confirmed', total: 3000000, note: '', created: TODAY, ...over});
const sum = (list) => list.reduce((a, b) => a + b.total, 0);

test('arrivalsToday: only Confirmed starting today', () => {
  const books = [
    mk({id: 'a1', status: 'Confirmed', start: TODAY}),
    mk({id: 'a2', status: 'Pending', start: TODAY}),
    mk({id: 'a3', status: 'Hold', start: TODAY}),
    mk({id: 'a4', status: 'Cancelled', start: TODAY}),
    mk({id: 'a5', status: 'No-show', start: TODAY}),
    mk({id: 'a6', status: 'Expired', start: TODAY}),
    mk({id: 'a7', status: 'Checked-out', start: TODAY}),
    mk({id: 'a8', status: 'Confirmed', start: '2026-09-20'}),
    mk({id: 'a9', status: 'Checked-in', start: TODAY}),
  ];
  assert.deepEqual(arrivalsToday(books, TODAY).map((b) => b.id), ['a1']);
  assert.equal(arrivalsToday(books, TODAY).length, 1);
});

test('inHouse: only Checked-in', () => {
  const books = [
    mk({id: 'h1', status: 'Checked-in'}),
    mk({id: 'h2', status: 'Confirmed'}),
    mk({id: 'h3', status: 'Checked-out'}),
    mk({id: 'h4', status: 'Pending'}),
    mk({id: 'h5', status: 'Hold'}),
  ];
  assert.deepEqual(inHouse(books).map((b) => b.id), ['h1']);
});

test('departuresToday: Checked-in ending today', () => {
  const books = [
    mk({id: 'd1', status: 'Checked-in', end: TODAY}),
    mk({id: 'd2', status: 'Checked-in', end: '2026-09-21'}),
    mk({id: 'd3', status: 'Confirmed', end: TODAY}),
    mk({id: 'd4', status: 'Checked-out', end: TODAY}),
    mk({id: 'd5', status: 'Pending', end: TODAY}),
  ];
  assert.deepEqual(departuresToday(books, TODAY).map((b) => b.id), ['d1']);
});

test('pendingReservations: only Pending', () => {
  const books = [
    mk({id: 'p1', status: 'Pending'}),
    mk({id: 'p2', status: 'Confirmed'}),
    mk({id: 'p3', status: 'Hold'}),
    mk({id: 'p4', status: 'Checked-in'}),
  ];
  assert.deepEqual(pendingReservations(books).map((b) => b.id), ['p1']);
});

test('guestValue: includes Confirmed, Checked-in, Checked-out', () => {
  const books = [
    mk({id: 'v1', guestId: 'GST-A', status: 'Confirmed', total: 1000000}),
    mk({id: 'v2', guestId: 'GST-A', status: 'Checked-in', total: 2000000}),
    mk({id: 'v3', guestId: 'GST-A', status: 'Checked-out', total: 4000000}),
  ];
  assert.equal(guestValue(books, 'GST-A'), 7000000);
  assert.deepEqual(GUEST_VALUE_STATUSES, ['Confirmed', 'Checked-in', 'Checked-out']);
});

test('guestValue: excludes Pending, Hold, Expired, Cancelled, No-show', () => {
  const books = [
    mk({id: 'x1', guestId: 'GST-B', status: 'Pending', total: 1000000}),
    mk({id: 'x2', guestId: 'GST-B', status: 'Hold', total: 2000000}),
    mk({id: 'x3', guestId: 'GST-B', status: 'Expired', total: 3000000}),
    mk({id: 'x4', guestId: 'GST-B', status: 'Cancelled', total: 4000000}),
    mk({id: 'x5', guestId: 'GST-B', status: 'No-show', total: 5000000}),
    mk({id: 'x6', guestId: 'GST-B', status: 'Confirmed', total: 6000000}),
  ];
  assert.equal(guestValue(books, 'GST-B'), 6000000);
  assert.equal(guestValue(books, 'GST-UNKNOWN'), 0);
  assert.equal(guestValue(books, ''), 0);
  assert.equal(guestValue([], 'GST-B'), 0);
});

test('guestValue: ignores bookings with no total', () => {
  assert.equal(guestValue([mk({guestId: 'GST-C', status: 'Confirmed', total: undefined})], 'GST-C'), 0);
});

test('actions: primary helper follows operatorTransitions', () => {
  assert.equal(getPrimaryOperatorAction('Pending'), 'Confirmed');
  assert.equal(getPrimaryOperatorAction('Hold'), 'Confirmed');
  assert.equal(getPrimaryOperatorAction('Confirmed'), 'Checked-in');
  assert.equal(getPrimaryOperatorAction('Checked-in'), 'Checked-out');
  assert.equal(getPrimaryOperatorAction('Checked-out'), undefined);
  assert.equal(getPrimaryOperatorAction('Cancelled'), undefined);
  assert.equal(getPrimaryOperatorAction('No-show'), undefined);
  assert.equal(getPrimaryOperatorAction('Expired'), undefined);
  assert.equal(getPrimaryOperatorAction('not-a-status'), undefined);
});

test('actions: primary is always an allowed operator transition', () => {
  for (const st of BOOKING_STATUSES) {
    const primary = getPrimaryOperatorAction(st);
    if (primary === undefined) {
      assert.equal(operatorTransitions(st).length, 0, st + ' should be terminal');
    } else {
      assert.ok(operatorTransitions(st).includes(primary), st + ' -> ' + primary + ' must be allowed');
    }
  }
});

test('actions: destructive helper only yields Cancelled / No-show and never for terminals', () => {
  assert.deepEqual(getDestructiveOperatorActions('Pending'), ['Cancelled']);
  assert.deepEqual(getDestructiveOperatorActions('Hold'), ['Cancelled']);
  assert.deepEqual(getDestructiveOperatorActions('Confirmed'), ['Cancelled', 'No-show']);
  assert.deepEqual(getDestructiveOperatorActions('Checked-in'), []);
  for (const st of BOOKING_STATUSES) {
    for (const d of getDestructiveOperatorActions(st)) {
      assert.ok(['Cancelled', 'No-show'].includes(d));
      assert.ok(operatorTransitions(st).includes(d));
    }
  }
});

test('actions: primary + secondary + destructive partition operatorTransitions', () => {
  for (const st of BOOKING_STATUSES) {
    const allowed = operatorTransitions(st);
    const primary = getPrimaryOperatorAction(st);
    const parts = [primary, ...getSecondaryOperatorActions(st), ...getDestructiveOperatorActions(st)].filter((x) => x !== undefined);
    assert.equal(parts.length, allowed.length, st + ' partition mismatch');
    assert.deepEqual([...parts].sort(), [...allowed].sort(), st + ' partition differs from allowed set');
  }
});

test('actions: operatorActionLabel covers every action button', () => {
  assert.equal(operatorActionLabel('Confirmed'), 'Konfirmasi');
  assert.equal(operatorActionLabel('Checked-in'), 'Check-in');
  assert.equal(operatorActionLabel('Checked-out'), 'Check-out');
  assert.equal(operatorActionLabel('Cancelled'), 'Batalkan');
  assert.equal(operatorActionLabel('No-show'), 'Tandai tidak datang');
});

test('presentation: all 8 statuses have label and tone', () => {
  const expected = new Map([
    ['Pending', 'Menunggu konfirmasi'],
    ['Hold', 'Ditahan sementara'],
    ['Confirmed', 'Terkonfirmasi'],
    ['Checked-in', 'Sedang menginap'],
    ['Checked-out', 'Selesai menginap'],
    ['Cancelled', 'Dibatalkan'],
    ['No-show', 'Tidak datang'],
    ['Expired', 'Kedaluwarsa'],
  ]);
  for (const st of BOOKING_STATUSES) {
    assert.ok(expected.has(st), 'missing expectation for ' + st);
    assert.equal(reservationStatusLabel(st), expected.get(st));
    const tone = reservationStatusTone(st);
    assert.ok(['green', 'blue', 'amber', 'red', 'muted'].includes(tone), 'bad tone for ' + st);
  }
  assert.equal(reservationStatusLabel('nonsense'), 'nonsense');
  assert.equal(reservationStatusTone('nonsense'), 'muted');
});

test('presentation: Pending is visually distinct from Confirmed', () => {
  assert.notEqual(reservationStatusTone('Pending'), reservationStatusTone('Confirmed'));
  assert.notEqual(reservationStatusLabel('Pending'), reservationStatusLabel('Confirmed'));
});

test('filters: every status covered exactly once outside Semua', () => {
  const coverage = filterGroupCoverage();
  assert.equal(coverage.length, BOOKING_STATUSES.length, 'coverage length must equal 8');
  for (const st of BOOKING_STATUSES) {
    const hits = coverage.filter((x) => x === st).length;
    assert.equal(hits, 1, st + ' covered ' + hits + ' times (no overlap, none missing)');
  }
});

test('filters: no overlap between groups', () => {
  const groups = RESERVATION_FILTER_GROUPS.filter((g) => g.key !== 'Semua');
  for (let i = 0; i < groups.length; i++) {
    for (let j = i + 1; j < groups.length; j++) {
      for (const st of groups[i].statuses) {
        assert.ok(!groups[j].statuses.includes(st), st + ' overlaps ' + groups[i].key + ' and ' + groups[j].key);
      }
    }
  }
});

test('filters: explicit typed mapping, no slice / magic index', () => {
  assert.deepEqual(statusesForFilter('Semua'), [...BOOKING_STATUSES]);
  assert.deepEqual(statusesForFilter('Aktif'), ['Confirmed', 'Checked-in']);
  assert.deepEqual(statusesForFilter('Menunggu'), ['Pending', 'Hold']);
  assert.deepEqual(statusesForFilter('Selesai'), ['Checked-out', 'Cancelled', 'No-show', 'Expired']);
  assert.equal(statusesForFilter('TidakAda'), undefined);
});

test('filters: matchesFilterGroup agrees with statusesForFilter', () => {
  for (const st of BOOKING_STATUSES) {
    assert.equal(matchesFilterGroup(st, 'Semua'), true);
    const hits = RESERVATION_FILTER_GROUPS.filter((g) => g.key !== 'Semua' && matchesFilterGroup(st, g.key)).length;
    assert.equal(hits, 1, st + ' matched by ' + hits + ' groups');
  }
  assert.equal(matchesFilterGroup('Confirmed', 'Selesai'), false);
  assert.equal(matchesFilterGroup('Pending', 'Aktif'), false);
});

test('legacy: undefined statusHistory is safe and never throws', () => {
  const b = mk({statusHistory: undefined});
  assert.equal(Array.isArray(b.statusHistory), false);
  const hist = b.statusHistory ?? [];
  assert.deepEqual(hist, []);
  assert.doesNotThrow(() => transitionBooking(b, 'Cancelled', 'operator'));
  assert.ok(Array.isArray(b.statusHistory) && b.statusHistory.length === 1);
});

test('history: source labels resolve without PII leakage', () => {
  assert.equal(statusSourceLabel('operator'), 'Operator');
  assert.equal(statusSourceLabel('beds24'), 'Beds24');
  assert.equal(statusSourceLabel('automation'), 'Otomatis');
  assert.equal(statusSourceLabel('unknown'), 'unknown');
  const evt = {to: 'Confirmed', at: '2026-09-19T08:00:00.000Z', source: 'operator'};
  assert.ok(!JSON.stringify(evt).includes('0812'));
});

test('WITA: date-only formatting is deterministic across timezones', () => {
  const cases = ['2026-09-19', '2026-01-01', '2026-12-31', '2024-02-29', '2026-07-04'];
  for (const d of cases) {
    const base = formatDateWITA(d);
    assert.equal(formatDateWITA(d), base, d + ' not deterministic');
    const anchored = new Intl.DateTimeFormat('id-ID', {timeZone: 'Asia/Makassar', day: 'numeric', month: 'short'}).format(new Date(Date.parse(d + 'T12:00:00+08:00')));
    assert.equal(base, anchored, d + ' must anchor at noon WITA and format in Asia/Makassar');
    const day = String(Number(d.slice(-2)));
    assert.ok(base.indexOf(day) !== -1, d + ' day number missing from ' + base);
  }
  // Anchored at noon WITA and formatted in Asia/Makassar: identical everywhere.
  const url = pathToFileURL(path.resolve('lib/operational.ts')).href;
  for (const tz of ['America/New_York', 'Pacific/Kiritimati', 'Europe/London', 'Asia/Makassar']) {
    const out = spawnSync(process.execPath, ['--input-type=module', '-e', 'import(' + JSON.stringify(url) + ').then((m) => console.log(m.formatDateWITA("2026-09-19", {weekday:"long", day:"numeric", month:"long", year:"numeric"})))'], {env: {...process.env, TZ: tz}, encoding: 'utf8'});
    assert.equal(out.status, 0, 'child failed for TZ=' + tz + ': ' + out.stderr);
    assert.ok(out.stdout.includes('Sabtu'), 'TZ=' + tz + ' weekday wrong: ' + out.stdout.trim());
    assert.ok(out.stdout.includes('19 September 2026'), 'TZ=' + tz + ' produced ' + out.stdout.trim());
  }
});

test('WITA: invalid / partial values fall through unchanged', () => {
  assert.equal(formatDateWITA(''), '');
  assert.equal(formatDateWITA('bukan-tanggal'), 'bukan-tanggal');
  assert.equal(formatDateWITA('2026-13-45'), '2026-13-45');
});

test('WITA: datetime formatter renders in Asia/Makassar', () => {
  const out = formatDateTimeWITA('2026-09-19T00:30:00Z');
  // 00:30Z = 08:30 WITA; day stays 19.
  assert.ok(out.includes('19'), out);
  assert.ok(out.includes('08.30') || out.includes('08:30'), out);
  assert.equal(formatDateTimeWITA('not-a-date'), 'not-a-date');
});
