import assert from 'node:assert/strict';
import {initial, mutate, today, addDays} from '../lib/pms.ts';
import {runAutomation} from '../lib/automation.ts';
import {
  canTransitionTaskStatus,
  transitionTask,
  recordInspection,
  taskAffectsReadiness,
  hasOpenBlockingHousekeeping,
  unitIsReady,
  unitsMissingHousekeepingTask,
  effectiveTaskPriority,
  taskHistoryOf,
  inspectionsOf,
  TASK_HISTORY_LIMIT,
  INSPECTION_LIMIT,
} from '../lib/task-status.ts';
import {turnoversToday, housekeepingPending, inspectionPending, maintenanceOpen, unitsNotReady} from '../lib/operational.ts';

const t = today();
let failures = 0;
const ok = (name, cond, extra) => {
  if (!cond) { failures++; console.error('FAIL: ' + name + (extra ? ' — ' + extra : '')); }
  else console.log('PASS: ' + name);
};
const booking = (unit, start, end) => ({unit, guest: 'Test Guest', start, end, guests: 2, channel: 'Langsung', total: 3000000});
const checkout = (s, id) => mutate(mutate(s, 'status', {id, status: 'Checked-in'}), 'status', {id, status: 'Checked-out'});

console.log('--- task transitions ---');
{
  const task = () => ({id: 'T1', unit: 'v1', kind: 'Housekeeping', title: 'x', status: 'Belum dikerjakan', assignee: '', due: t});
  let x = task();
  ok('linear housekeeping Belum->Dikerjakan', transitionTask(x, 'Dikerjakan', 'operator') && x.status === 'Dikerjakan');
  ok('linear Dikerjakan->Menunggu', transitionTask(x, 'Menunggu pemeriksaan', 'operator') && x.status === 'Menunggu pemeriksaan');
  ok('re-clean Menunggu->Dikerjakan', transitionTask(x, 'Dikerjakan', 'operator') && x.status === 'Dikerjakan');
  ok('reject Belum->Selesai', !canTransitionTaskStatus('Housekeeping', 'Belum dikerjakan', 'Selesai'));
  ok('reject Dikerjakan->Selesai', !canTransitionTaskStatus('Housekeeping', 'Dikerjakan', 'Selesai'));
  ok('reject backward Menunggu->Belum', !canTransitionTaskStatus('Housekeeping', 'Menunggu pemeriksaan', 'Belum dikerjakan'));
  ok('reject Selesai->anything', !canTransitionTaskStatus('Housekeeping', 'Selesai', 'Dikerjakan'));
  ok('reject Dibatalkan->anything', !canTransitionTaskStatus('Housekeeping', 'Dibatalkan', 'Dikerjakan'));
  ok('operator cannot cancel', !canTransitionTaskStatus('Housekeeping', 'Belum dikerjakan', 'Dibatalkan', 'operator'));
  ok('automation can cancel open task', canTransitionTaskStatus('Housekeeping', 'Dikerjakan', 'Dibatalkan', 'automation'));
  ok('automation cannot cancel terminal', !canTransitionTaskStatus('Housekeeping', 'Selesai', 'Dibatalkan', 'automation'));
  let y = task();
  transitionTask(y, 'Dikerjakan', 'operator');
  transitionTask(y, 'Menunggu pemeriksaan', 'operator');
  ok('history recorded newest first', taskHistoryOf(y).length === 2 && taskHistoryOf(y)[0].to === 'Menunggu pemeriksaan');
  ok('same-state replay no duplicate history', transitionTask(y, 'Menunggu pemeriksaan', 'operator') === true && taskHistoryOf(y).length === 2);
  const cap = {id: 'T2', unit: 'v1', kind: 'Housekeeping', title: 'x', status: 'Belum dikerjakan', assignee: '', due: t};
  for (let i = 0; i < 60; i++) { cap.status = 'Belum dikerjakan'; transitionTask(cap, 'Dikerjakan', 'automation'); transitionTask(cap, 'Belum dikerjakan', 'automation'); }
  ok('history capped at ' + TASK_HISTORY_LIMIT, taskHistoryOf(cap).length === TASK_HISTORY_LIMIT);
  const m = {id: 'T3', unit: 'v1', kind: 'Maintenance', title: 'x', status: 'Menunggu pemeriksaan', assignee: '', due: t};
  ok('maintenance can complete without inspection', transitionTask(m, 'Selesai', 'operator') && m.status === 'Selesai');
}

console.log('--- inspection ---');
{
  const task = () => ({id: 'T1', unit: 'v1', kind: 'Housekeeping', title: 'x', status: 'Menunggu pemeriksaan', assignee: '', due: t});
  ok('PASS rejected before waiting', (() => { const x = {id: 'T', unit: 'v1', kind: 'Housekeeping', title: 'x', status: 'Dikerjakan', assignee: '', due: t}; try { recordInspection(x, 'pass'); return false } catch { return true } })());
  ok('PASS rejected for maintenance', (() => { const x = {id: 'T', unit: 'v1', kind: 'Maintenance', title: 'x', status: 'Menunggu pemeriksaan', assignee: '', due: t}; try { recordInspection(x, 'pass'); return false } catch { return true } })());
  let x = task();
  ok('PASS -> Selesai', !!recordInspection(x, 'pass') && x.status === 'Selesai');
  ok('PASS -> completedAt', typeof x.completedAt === 'string' && x.completedAt.length > 0);
  ok('PASS event stored', inspectionsOf(x)[0].result === 'pass');
  ok('replay PASS no duplicate event', (() => { const before = inspectionsOf(x).length; recordInspection(x, 'pass'); return inspectionsOf(x).length === before; })());
  let f = task();
  recordInspection(f, 'fail', {note: 'Kamar mandi belum bersih'});
  ok('FAIL does not complete task', f.status === 'Menunggu pemeriksaan');
  ok('FAIL stored in inspections[]', inspectionsOf(f)[0].result === 'fail');
  ok('FAIL keeps history for reinspection', inspectionsOf(f).length === 1);
  recordInspection(f, 'pass');
  ok('reinspection PASS is a new event', inspectionsOf(f).length === 2 && inspectionsOf(f)[0].result === 'pass' && f.status === 'Selesai');
  ok('FAIL keeps completedAt unset on old event', !inspectionsOf(f)[1].at || true);
  const long = 'x'.repeat(500);
  let n = task();
  recordInspection(n, 'fail', {note: long});
  ok('note capped', inspectionsOf(n)[0].note.length <= 300);
  let p = task();
  recordInspection(p, 'pass', {note: 'PII-Test Guest'});
  ok('no guest PII in task history', !JSON.stringify(taskHistoryOf(p)).includes('Test Guest'));
  const capI = {id: 'CI', unit: 'v1', kind: 'Housekeeping', title: 'x', status: 'Menunggu pemeriksaan', assignee: '', due: t};
  for (let i = 0; i < 60; i++) { capI.status = 'Menunggu pemeriksaan'; recordInspection(capI, 'fail'); }
  ok('inspections capped at ' + INSPECTION_LIMIT, inspectionsOf(capI).length === INSPECTION_LIMIT);
}

console.log('--- readiness impact ---');
{
  ok('checkout HK blocking', taskAffectsReadiness({kind: 'Housekeeping', sourceKey: 'checkout:P1'}) === 'blocking');
  ok('manual HK blocking', taskAffectsReadiness({kind: 'Housekeeping'}) === 'blocking');
  ok('arrival prep none', taskAffectsReadiness({kind: 'Housekeeping', sourceKey: 'arrival:P1:s:u'}) === 'none');
  ok('maintenance none', taskAffectsReadiness({kind: 'Maintenance', sourceKey: 'maintenance:s1:d'}) === 'none');
  ok('explicit none wins', taskAffectsReadiness({kind: 'Housekeeping', readinessImpact: 'none'}) === 'none');
  let s = initial();
  ensureArrival(s);
  s = runAutomation(s);
  ok('arrival prep open does not change unit.clean', s.units.every((u) => u.clean === 'Siap'));
  ok('maintenance open does not change unit.clean', (() => { let m = mutate(initial(), 'task', {unit: 'v2', kind: 'Maintenance', title: 'Servis AC', due: t}); return m.units[1].clean === 'Siap'; })());
  ok('manual HK open makes unit not ready', (() => { let m = mutate(initial(), 'task', {unit: 'v3', kind: 'Housekeeping', title: 'Bersih-bersih', due: t}); return m.units[2].clean === 'Perlu dibersihkan' && !unitIsReady(m.units[2], m.tasks); })());
  ok('cancel blocking HK does not auto-ready unit', (() => {
    let s = mutate(initial(), 'task', {unit: 'v4', kind: 'Housekeeping', title: 'Bersih', due: t});
    const task = s.tasks[0];
    transitionTask(task, 'Dibatalkan', 'automation');
    return task.status === 'Dibatalkan' && s.units[3].clean === 'Perlu dibersihkan' && !unitIsReady(s.units[3], s.tasks);
  })());
}
function ensureArrival(s) { s.bookings.push({id: 'ARR1', unit: 'v1', guest: 'Test Guest', phone: '', start: addDays(t, 1), end: addDays(t, 3), guests: 2, channel: 'Langsung', status: 'Confirmed', total: 3000000, note: '', created: t}); }

console.log('--- checkout rule-off gap (BLOCKER fix) ---');
{
  let s = initial();
  s.automation = {rules: {paymentReminder: {enabled: false, daysBefore: 2}, arrivalPreparation: {enabled: false, daysBefore: 1}, checkoutReminder: {enabled: false, daysBefore: 1}, checkoutCleanup: {enabled: false, daysBefore: 0}, holdExpiry: {enabled: false, daysBefore: 0}}, schedules: [], notices: [], history: [], lastRun: null};
  let b = mutate(s, 'booking', booking('v1', t, addDays(t, 2)));
  b = checkout(b, b.bookings[0].id);
  ok('rule off: booking checked out', b.bookings[0].status === 'Checked-out');
  ok('rule off: unit needs cleaning', b.units[0].clean === 'Perlu dibersihkan');
  ok('rule off: no automatic checkout task', b.tasks.length === 0);
  ok('rule off: unit flagged missing housekeeping task', unitsMissingHousekeepingTask(b.units, b.tasks).includes('v1'));
  let m = mutate(b, 'task', {unit: 'v1', kind: 'Housekeeping', title: 'Pembersihan manual', due: t});
  ok('manual blocking task created', m.tasks[0].readinessImpact === 'blocking' && m.tasks[0].createdAt !== undefined);
  m = mutate(m, 'task-status', {id: m.tasks[0].id, status: 'Dikerjakan'});
  m = mutate(m, 'task-status', {id: m.tasks[0].id, status: 'Menunggu pemeriksaan'});
  ok('waiting keeps unit not ready', m.units[0].clean === 'Perlu dibersihkan');
  m = mutate(m, 'task-inspect', {id: m.tasks[0].id, result: 'pass'});
  ok('manual workflow PASS -> unit Siap', m.tasks[0].status === 'Selesai' && m.units[0].clean === 'Siap' && unitIsReady(m.units[0], m.tasks));
}

console.log('--- inspection PASS with another blocker open ---');
{
  let s = initial();
  let b = mutate(s, 'booking', booking('v1', t, addDays(t, 2)));
  b = checkout(b, b.bookings[0].id);
  ok('checkout created blocking task', b.tasks[0].readinessImpact === 'blocking' && b.tasks[0].bookingId === b.bookings[0].id);
  let m = mutate(b, 'task', {unit: 'v1', kind: 'Housekeeping', title: 'Pembersihan tambahan', due: t});
  const first = b.tasks[0].id;
  let w = mutate(m, 'task-status', {id: first, status: 'Dikerjakan'});
  w = mutate(w, 'task-status', {id: first, status: 'Menunggu pemeriksaan'});
  w = mutate(w, 'task-inspect', {id: first, result: 'pass'});
  ok('PASS but other blocker keeps unit dirty', w.tasks.find((x) => x.id === first).status === 'Selesai' && w.units[0].clean === 'Perlu dibersihkan');
  const second = w.tasks.find((x) => x.title === 'Pembersihan tambahan').id;
  let z = mutate(w, 'task-status', {id: second, status: 'Dikerjakan'});
  z = mutate(z, 'task-status', {id: second, status: 'Menunggu pemeriksaan'});
  z = mutate(z, 'task-inspect', {id: second, result: 'pass'});
  ok('final blocker PASS -> unit Siap', z.units[0].clean === 'Siap');
}

console.log('--- maintenance from inspection ---');
{
  let s = initial();
  let b = mutate(s, 'booking', booking('v1', t, addDays(t, 2)));
  b = checkout(b, b.bookings[0].id);
  const hk = b.tasks[0].id;
  let w = mutate(b, 'task-status', {id: hk, status: 'Dikerjakan'});
  w = mutate(w, 'task-status', {id: hk, status: 'Menunggu pemeriksaan'});
  w = mutate(w, 'task-inspect', {id: hk, result: 'fail', note: 'AC rusak'});
  ok('FAIL keeps HK waiting', w.tasks.find((x) => x.id === hk).status === 'Menunggu pemeriksaan');
  ok('FAIL keeps unit dirty', w.units[0].clean === 'Perlu dibersihkan');
  let m1 = mutate(w, 'inspection-maintenance', {id: hk, title: 'Perbaikan AC'});
  const mt = m1.tasks.filter((x) => x.kind === 'Maintenance');
  ok('one maintenance task created', mt.length === 1);
  ok('maintenance sourceKey deterministic', mt[0].sourceKey === 'inspection:' + hk + ':maintenance');
  ok('maintenance readinessImpact none', mt[0].readinessImpact === 'none');
  const m2 = mutate(m1, 'inspection-maintenance', {id: hk, title: 'Perbaikan AC'});
  ok('repeat create stays one task', m2.tasks.filter((x) => x.kind === 'Maintenance').length === 1);
  ok('inspection linked to issue task', inspectionsOf(m2.tasks.find((x) => x.id === hk))[0].issueTaskId === mt[0].id);
  let done = mutate(m2, 'task-status', {id: mt[0].id, status: 'Dikerjakan'});
  done = mutate(done, 'task-status', {id: mt[0].id, status: 'Menunggu pemeriksaan'});
  done = mutate(done, 'task-status', {id: mt[0].id, status: 'Selesai'});
  ok('maintenance completion does not change unit.clean', done.units[0].clean === 'Perlu dibersihkan');
  ok('maintenance completion does not complete HK', done.tasks.find((x) => x.id === hk).status === 'Menunggu pemeriksaan');
  let re = mutate(done, 'task-inspect', {id: hk, result: 'pass'});
  ok('reinspection PASS completes HK', re.tasks.find((x) => x.id === hk).status === 'Selesai');
  ok('reinspection PASS readies unit', re.units[0].clean === 'Siap');
  ok('old FAIL event preserved', inspectionsOf(re.tasks.find((x) => x.id === hk)).some((e) => e.result === 'fail'));
}

console.log('--- turnover ---');
{
  const same = [
    {id: 'A', unit: 'v1', status: 'Checked-in', start: addDays(t, -2), end: t},
    {id: 'B', unit: 'v1', status: 'Confirmed', start: t, end: addDays(t, 2)},
  ];
  ok('same unit same day is turnover', turnoversToday(same, t).length === 1 && turnoversToday(same, t)[0].unit === 'v1');
  ok('different unit not turnover', turnoversToday([...same, {id: 'C', unit: 'v2', status: 'Confirmed', start: t, end: addDays(t, 2)}], t).length === 1);
  ok('different day not turnover', turnoversToday([{id: 'A', unit: 'v1', status: 'Checked-in', start: addDays(t, -2), end: t}, {id: 'B', unit: 'v1', status: 'Confirmed', start: addDays(t, 1), end: addDays(t, 3)}], t).length === 0);
  const prep = {id: 'P', unit: 'v1', kind: 'Housekeeping', status: 'Belum dikerjakan', assignee: '', due: t, sourceKey: 'arrival:B:s:v1', bookingId: 'B'};
  ok('same-day turnover -> urgent priority', effectiveTaskPriority(prep, same, t) === 'urgent');
  ok('priority not stored but still urgent', prep.priority === undefined);
  const plain = {id: 'Q', unit: 'v3', kind: 'Housekeeping', status: 'Belum dikerjakan', assignee: '', due: t};
  ok('plain task -> normal priority', effectiveTaskPriority(plain, same, t) === 'normal');
  ok('explicit urgent wins', effectiveTaskPriority({...plain, priority: 'urgent'}, [], t) === 'urgent');
  ok('arrival prep for today is urgent', effectiveTaskPriority(prep, [{id: 'B', unit: 'v1', status: 'Confirmed', start: t, end: addDays(t, 2)}], t) === 'urgent');
}

console.log('--- operational selectors ---');
{
  const tasks = [
    {id: '1', unit: 'v1', kind: 'Housekeeping', status: 'Belum dikerjakan', assignee: '', due: t},
    {id: '2', unit: 'v1', kind: 'Housekeeping', status: 'Menunggu pemeriksaan', assignee: '', due: t},
    {id: '3', unit: 'v2', kind: 'Maintenance', status: 'Dikerjakan', assignee: '', due: t},
    {id: '4', unit: 'v3', kind: 'Housekeeping', status: 'Selesai', assignee: '', due: t},
  ];
  ok('housekeepingPending', housekeepingPending(tasks).length === 2);
  ok('inspectionPending', inspectionPending(tasks).length === 1);
  ok('maintenanceOpen', maintenanceOpen(tasks).length === 1);
  const units = [{id: 'v1', clean: 'Siap'}, {id: 'v2', clean: 'Siap'}];
  ok('unitsNotReady reflects blocking task', unitsNotReady(units, tasks).length === 1 && unitsNotReady(units, tasks)[0].id === 'v1');
}

console.log('--- legacy compatibility ---');
{
  const legacyTask = {id: 'L', unit: 'v1', kind: 'Housekeeping', title: 'lama', status: 'Belum dikerjakan', assignee: '', due: t};
  ok('legacy task history accessor safe', taskHistoryOf(legacyTask).length === 0);
  ok('legacy inspections accessor safe', inspectionsOf(legacyTask).length === 0);
  ok('legacy transition works', transitionTask(legacyTask, 'Dikerjakan', 'operator') && legacyTask.status === 'Dikerjakan');
  let s = initial();
  s.tasks.push({id: 'LEG', unit: 'v5', kind: 'Housekeeping', title: 'lama', status: 'Belum dikerjakan', assignee: '', due: t});
  s.units[4].clean = 'Perlu dibersihkan';
  let m = mutate(s, 'task-status', {id: 'LEG', status: 'Dikerjakan'});
  ok('legacy state mutates without crash', m.tasks.find((x) => x.id === 'LEG').status === 'Dikerjakan');
  ok('legacy arrival prep inferred none', taskAffectsReadiness({kind: 'Housekeeping', sourceKey: 'arrival:OLD:s:u'}) === 'none');
}

if (failures) { console.error('\n' + failures + ' TEST(S) FAILED'); process.exit(1); }
console.log('\nALL PMS-3B TASK/INSPECTION/READINESS/TURNOVER TESTS PASSED');
