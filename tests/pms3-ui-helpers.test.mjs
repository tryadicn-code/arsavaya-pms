import assert from 'node:assert/strict';
import test from 'node:test';
import {initial, mutate, today, addDays} from '../lib/pms.ts';
import {
  nextArrivalForUnit,
  TASK_FILTERS,
  matchesTaskFilter,
  linkedMaintenance,
  unitOperationalSummary,
  unitsMissingHousekeepingTask,
  turnoversToday,
  housekeepingPending,
  inspectionPending,
  maintenanceOpen,
  getPrimaryTaskAction,
  taskOperatorTransitions,
  taskStatusLabel,
  taskStatusTone,
} from '../lib/operational.ts';
import {canTransitionTaskStatus} from '../lib/task-status.ts';

const TODAY = '2026-09-19';
const mkB = (over) => ({id: 'RSV-1', unit: 'v1', guest: 'Test', phone: '', start: TODAY, end: '2026-09-21', guests: 2, channel: 'Langsung', status: 'Confirmed', total: 100, note: '', created: TODAY, ...over});
const mkT = (over) => ({id: 'T-1', unit: 'v1', kind: 'Housekeeping', title: 'Pembersihan', status: 'Belum dikerjakan', assignee: '', due: TODAY, ...over});
const ctx = (books) => ({bookings: books, today: TODAY});

test('nextArrival: excludes Cancelled / No-show / Expired', () => {
  const books = [
    mkB({id: 'c1', status: 'Cancelled', start: '2026-09-20'}),
    mkB({id: 'c2', status: 'No-show', start: '2026-09-21'}),
    mkB({id: 'c3', status: 'Expired', start: '2026-09-22'}),
  ];
  assert.equal(nextArrivalForUnit(books, 'v1', TODAY), undefined);
});

test('nextArrival: returns nearest future valid booking', () => {
  const books = [
    mkB({id: 'far', status: 'Confirmed', start: '2026-09-25'}),
    mkB({id: 'near', status: 'Confirmed', start: '2026-09-20'}),
    mkB({id: 'other-unit', unit: 'v2', status: 'Confirmed', start: '2026-09-19'}),
  ];
  assert.equal(nextArrivalForUnit(books, 'v1', TODAY), '2026-09-20');
});

test('nextArrival: in-house booking with passed arrival is not the next arrival', () => {
  const books = [mkB({id: 'stay', status: 'Checked-in', start: '2026-09-17', end: '2026-09-21'}), mkB({id: 'next', status: 'Confirmed', start: '2026-09-22', end: '2026-09-24'})];
  assert.equal(nextArrivalForUnit(books, 'v1', TODAY), '2026-09-22');
});

test('filters: preserve task uniqueness (no duplicates, nothing lost under Semua)', () => {
  const books = [mkB({id: 'a', status: 'Confirmed', start: TODAY})];
  const tasks = [
    mkT({id: 't1', status: 'Belum dikerjakan', assignee: 'Andi'}),
    mkT({id: 't2', status: 'Dikerjakan', assignee: ''}),
    mkT({id: 't3', status: 'Menunggu pemeriksaan', assignee: 'Andi'}),
    mkT({id: 't4', status: 'Selesai', assignee: ''}),
  ];
  for (const f of TASK_FILTERS) {
    const ids = tasks.filter((x) => matchesTaskFilter(x, f, ctx(books))).map((x) => x.id);
    assert.equal(new Set(ids).size, ids.length, 'duplicate tasks under ' + f);
  }
  const all = tasks.filter((x) => matchesTaskFilter(x, 'Semua', ctx(books))).map((x) => x.id);
  assert.deepEqual(all.sort(), ['t1', 't2', 't3', 't4'].sort());
});

test('filter Belum ditugaskan: only tasks without assignee', () => {
  const tasks = [mkT({id: 't1', assignee: 'Andi'}), mkT({id: 't2', assignee: ''}), mkT({id: 't3', assignee: '  '})];
  const ids = tasks.filter((x) => matchesTaskFilter(x, 'Belum ditugaskan', ctx([]))).map((x) => x.id);
  assert.deepEqual(ids, ['t2', 't3']);
});

test('filter Mendesak: uses effective priority, not stored priority alone', () => {
  const books = [mkB({id: 'arr', status: 'Confirmed', start: TODAY}), mkB({id: 'dep', status: 'Checked-in', start: '2026-09-17', end: TODAY})];
  const stored = mkT({id: 'stored', priority: 'urgent', unit: 'v2'});
  assert.equal(matchesTaskFilter(stored, 'Mendesak', ctx(books)), true);
  const turnover = mkT({id: 'turn', unit: 'v1', priority: 'normal'}); // v1 has arrival + departure today
  assert.equal(matchesTaskFilter(turnover, 'Mendesak', ctx(books)), true);
  const calm = mkT({id: 'calm', unit: 'v3', priority: 'normal'});
  assert.equal(matchesTaskFilter(calm, 'Mendesak', ctx(books)), false);
});

test('filter Menunggu pemeriksaan and Selesai are status-based', () => {
  const tasks = [mkT({id: 'w', status: 'Menunggu pemeriksaan'}), mkT({id: 'd', status: 'Dikerjakan'}), mkT({id: 's', status: 'Selesai'})];
  const c = ctx([]);
  assert.deepEqual(tasks.filter((x) => matchesTaskFilter(x, 'Menunggu pemeriksaan', c)).map((x) => x.id), ['w']);
  assert.deepEqual(tasks.filter((x) => matchesTaskFilter(x, 'Selesai', c)).map((x) => x.id), ['s']);
});

test('missing-HK-task selector: dirty unit without blocking task is reported', () => {
  const units = [{id: 'v1', clean: 'Perlu dibersihkan'}, {id: 'v2', clean: 'Siap'}];
  const tasks = [mkT({id: 't1', unit: 'v1', status: 'Selesai', readinessImpact: 'blocking'})];
  assert.deepEqual(unitsMissingHousekeepingTask(units, tasks), ['v1']);
  const tasks2 = [mkT({id: 't1', unit: 'v1', status: 'Dikerjakan', readinessImpact: 'blocking'})];
  assert.deepEqual(unitsMissingHousekeepingTask(units, tasks2), []);
});

test('linked maintenance lookup: issue id wins, sourceKey fallback, no duplicate', () => {
  const hk = mkT({id: 'hk1', status: 'Menunggu pemeriksaan', inspections: [{result: 'fail', at: '2026-09-19T10:00:00Z', issueTaskId: 'mt9'}]});
  const tasks = [
    {id: 'mt9', unit: 'v1', kind: 'Maintenance', title: 'Perbaikan A', status: 'Belum dikerjakan', sourceKey: 'inspection:hk1:maintenance'},
    {id: 'legacy', unit: 'v1', kind: 'Maintenance', title: 'Perbaikan lama', status: 'Selesai', sourceKey: 'inspection:hk1:maintenance'},
  ];
  const found = linkedMaintenance(tasks, hk);
  assert.equal(found && found.id, 'mt9');
  const legacy = linkedMaintenance(tasks.slice().reverse(), {id: 'hk1'});
  assert.equal(legacy && legacy.id, 'legacy');
  assert.equal(linkedMaintenance(tasks, {id: 'hk1'}) && linkedMaintenance(tasks, {id: 'hk1'}).id, 'mt9');
});

test('unit summary: availability and readiness stay distinct', () => {
  const units = [{id: 'v1', clean: 'Siap'}];
  const books = [mkB({id: 'stay', status: 'Checked-in', start: '2026-09-17', end: '2026-09-21'})];
  const sum = unitOperationalSummary(units[0], [], books, TODAY);
  assert.equal(sum.occupied, true);
  assert.equal(sum.ready, true);
  assert.equal(sum.readyLabel, 'Siap');
  // bookable but dirty
  const sum2 = unitOperationalSummary({id: 'v2', clean: 'Perlu dibersihkan'}, [], books, TODAY);
  assert.equal(sum2.occupied, false);
  assert.equal(sum2.ready, false);
  assert.equal(sum2.readyLabel, 'Perlu dibersihkan');
});

test('unit summary: defensive mismatch shows Belum siap without mutation', () => {
  const units = [{id: 'v1', clean: 'Siap'}];
  const tasks = [mkT({id: 't1', unit: 'v1', status: 'Dikerjakan', readinessImpact: 'blocking'})];
  const before = units[0].clean;
  const sum = unitOperationalSummary(units[0], tasks, [], TODAY);
  assert.equal(sum.ready, false);
  assert.equal(sum.readyLabel, 'Belum siap');
  assert.equal(sum.readyHint, 'Housekeeping masih aktif');
  assert.equal(units[0].clean, before, 'render must not mutate state');
});

test('task presentation: all five statuses have label and tone', () => {
  for (const st of ['Belum dikerjakan', 'Dikerjakan', 'Menunggu pemeriksaan', 'Selesai', 'Dibatalkan']) {
    assert.ok(taskStatusLabel(st), 'label for ' + st);
    assert.ok(taskStatusTone(st), 'tone for ' + st);
  }
});

test('inspection CTA gating: housekeeping cannot complete without inspection', () => {
  assert.equal(canTransitionTaskStatus('Housekeeping', 'Menunggu pemeriksaan', 'Selesai', 'operator'), false);
  assert.equal(canTransitionTaskStatus('Maintenance', 'Menunggu pemeriksaan', 'Selesai', 'operator'), true);
  assert.equal(getPrimaryTaskAction('Housekeeping', 'Menunggu pemeriksaan'), undefined);
  assert.equal(getPrimaryTaskAction('Housekeeping', 'Belum dikerjakan'), 'Dikerjakan');
  assert.equal(getPrimaryTaskAction('Housekeeping', 'Dikerjakan'), 'Menunggu pemeriksaan');
  assert.equal(getPrimaryTaskAction('Maintenance', 'Menunggu pemeriksaan'), 'Selesai');
});

test('fail path: re-clean is allowed, inspection history is never erased', () => {
  let s = initial(false);
  s.units = [{id: 'v1', name: 'Vila 01', capacity: 4, rate: 100, clean: 'Perlu dibersihkan'}];
  s.bookings = [mkB({id: 'RSV-1', unit: 'v1', status: 'Checked-in', start: '2026-09-17', end: '2026-09-21'})];
  s.tasks = [];
  s.audit = [];
  const t0 = today();
  s = mutate(s, 'task', {unit: 'v1', kind: 'Housekeeping', title: 'Pembersihan', assignee: '', due: t0});
  const hkId = s.tasks[0].id;
  s = mutate(s, 'task-status', {id: hkId, status: 'Dikerjakan'});
  s = mutate(s, 'task-status', {id: hkId, status: 'Menunggu pemeriksaan'});
  s = mutate(s, 'task-inspect', {id: hkId, result: 'fail', note: 'Noda tersisa'});
  const hk1 = s.tasks.find((x) => x.id === hkId);
  assert.equal(hk1.status, 'Menunggu pemeriksaan');
  assert.equal(hk1.inspections.length, 1);
  assert.equal(s.units[0].clean, 'Perlu dibersihkan');
  // re-clean keeps the fail event
  s = mutate(s, 'task-status', {id: hkId, status: 'Dikerjakan'});
  const hk2 = s.tasks.find((x) => x.id === hkId);
  assert.equal(hk2.status, 'Dikerjakan');
  assert.equal(hk2.inspections.length, 1, 'inspection history preserved');
});

test('end-to-end: checkout -> clean -> fail -> maintenance -> reinspect pass -> unit ready', () => {
  let s = initial(false);
  s.units = [{id: 'v1', name: 'Vila 01', capacity: 4, rate: 100, clean: 'Siap'}];
  const t0 = today();
  s.bookings = [{id: 'RSV-9', unit: 'v1', guest: 'Tamu', phone: '', start: addDays(t0, -2), end: t0, guests: 2, channel: 'Langsung', status: 'Checked-in', total: 200, note: '', created: t0}];
  s.tasks = []; s.audit = []; s.payments = []; s.blocks = [];
  // checkout creates blocking housekeeping task
  s = mutate(s, 'status', {id: 'RSV-9', status: 'Checked-out'});
  assert.equal(s.units[0].clean, 'Perlu dibersihkan');
  const hkId = s.tasks.find((x) => x.kind === 'Housekeeping').id;
  s = mutate(s, 'task-status', {id: hkId, status: 'Dikerjakan'});
  s = mutate(s, 'task-status', {id: hkId, status: 'Menunggu pemeriksaan'});
  s = mutate(s, 'task-inspect', {id: hkId, result: 'fail', note: 'AC rusak'});
  const hkAfterFail = s.tasks.find((x) => x.id === hkId);
  assert.equal(hkAfterFail.status, 'Menunggu pemeriksaan');
  assert.equal(s.units[0].clean, 'Perlu dibersihkan');
  // maintenance from inspection (idempotent)
  s = mutate(s, 'inspection-maintenance', {id: hkId, title: 'Perbaikan AC', due: t0, assignee: 'Teknisi'});
  s = mutate(s, 'inspection-maintenance', {id: hkId, title: 'Perbaikan AC', due: t0, assignee: 'Teknisi'});
  const mts = s.tasks.filter((x) => x.sourceKey === 'inspection:' + hkId + ':maintenance');
  assert.equal(mts.length, 1, 'exactly one linked maintenance task');
  const mtId = mts[0].id;
  const hkLinked = s.tasks.find((x) => x.id === hkId);
  assert.equal(hkLinked.inspections[0].issueTaskId, mtId);
  // maintenance completes; housekeeping parent still waits for inspection
  s = mutate(s, 'task-status', {id: mtId, status: 'Dikerjakan'});
  s = mutate(s, 'task-status', {id: mtId, status: 'Menunggu pemeriksaan'});
  s = mutate(s, 'task-status', {id: mtId, status: 'Selesai'});
  const hkMid = s.tasks.find((x) => x.id === hkId);
  assert.equal(hkMid.status, 'Menunggu pemeriksaan');
  assert.equal(s.units[0].clean, 'Perlu dibersihkan', 'maintenance completion must not clean the unit');
  // reinspection pass completes housekeeping and readies the unit
  s = mutate(s, 'task-inspect', {id: hkId, result: 'pass'});
  const hkDone = s.tasks.find((x) => x.id === hkId);
  assert.equal(hkDone.status, 'Selesai');
  assert.equal(s.units[0].clean, 'Siap');
  assert.equal(hkDone.inspections.length, 2);
  assert.equal(hkDone.taskHistory.length >= 3, true);
});

test('availability unaffected: housekeeping/maintenance never touch booking blocking', () => {
  let s = initial(false);
  s.units = [{id: 'v1', name: 'Vila 01', capacity: 4, rate: 100, clean: 'Perlu dibersihkan'}];
  const t0 = today();
  s.bookings = []; s.tasks = []; s.audit = []; s.payments = []; s.blocks = [];
  s = mutate(s, 'task', {unit: 'v1', kind: 'Maintenance', title: 'Perbaikan', due: t0});
  // unit is dirty + has maintenance, but nothing blocks a new booking
  assert.doesNotThrow(() => {s = mutate(s, 'booking', {unit: 'v1', guest: 'Baru', phone: '', start: addDays(t0, 5), end: addDays(t0, 7), guests: 2, channel: 'Langsung', total: 200});});
  assert.equal(s.bookings.length, 1);
});

test('board selectors derived from state (counts, no hard-coded values)', () => {
  let s = initial(false);
  s.units = [{id: 'v1', name: 'Vila 01', capacity: 4, rate: 100, clean: 'Siap'}, {id: 'v2', name: 'Vila 02', capacity: 4, rate: 100, clean: 'Siap'}];
  s.tasks = [mkT({id: 'a', unit: 'v1', status: 'Belum dikerjakan', readinessImpact: 'blocking'})];
  s.bookings = []; s.audit = [];
  assert.equal(housekeepingPending(s.tasks).length, 1);
  assert.equal(inspectionPending(s.tasks).length, 0);
  assert.equal(maintenanceOpen(s.tasks).length, 0);
  assert.equal(unitsMissingHousekeepingTask(s.units, s.tasks).length, 0);
  assert.equal(turnoversToday(s.bookings, today()).length, 0);
});

test('legacy task without inspections/history is safe for presentation', () => {
  const t1 = mkT({id: 'legacy'});
  assert.equal(matchesTaskFilter(t1, 'Semua', ctx([])), true);
  assert.equal(taskStatusLabel(t1.status), 'Belum dikerjakan');
  assert.equal(linkedMaintenance([], t1), undefined);
});
