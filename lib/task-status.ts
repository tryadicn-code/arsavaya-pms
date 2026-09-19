/**
 * ARSAVAYA PMS — task domain (PMS-3B core).
 *
 * Single source of truth for Housekeeping / Maintenance task workflow.
 * Mirrors the layering of lib/booking-status.ts: this module imports nothing
 * from the rest of the app so that pms.ts, automation.ts and the UI all derive
 * task transitions, readiness semantics and inspection history from one place.
 *
 * Architecture (locked by PMS-3A/PMS-3B):
 *   Task.status     -> source of truth for the workflow task
 *   unit.clean      -> source of truth for operational readiness
 * Operational readiness is NOT a pure derivation of "task exists or not":
 * absence of a task is never proof that a unit is clean. A unit only returns
 * to `Siap` through inspection PASS on a readiness-blocking housekeeping task
 * with no other blocking housekeeping task still open.
 *
 * Booking availability and operational readiness stay separate; this module
 * never touches blocksAvailability(), Beds24 or iCal.
 */

export type TaskStatus =
  | 'Belum dikerjakan'
  | 'Dikerjakan'
  | 'Menunggu pemeriksaan'
  | 'Selesai'
  | 'Dibatalkan';

export type TaskTransitionSource = 'operator' | 'automation';

export type InspectionResult = 'pass' | 'fail';

export type TaskPriority = 'normal' | 'urgent';

export type ReadinessImpact = 'blocking' | 'none';

export type InspectionEvent = {
  result: InspectionResult;
  at: string;
  by?: string;
  note?: string;
  issueTaskId?: string;
};

export type TaskStatusEvent = {
  from?: TaskStatus;
  to: TaskStatus;
  at: string;
  source: TaskTransitionSource;
  reason?: string;
};

/**
 * Task shape extended additively (PMS-3B). Every new field is optional so
 * legacy State stored in pms_workspace.data remains valid without migration.
 */
export type Task = {
  id: string;
  unit: string;
  kind: string;
  title: string;
  status: string;
  assignee: string;
  due: string;
  sourceKey?: string;
  priority?: TaskPriority;
  notes?: string;
  bookingId?: string;
  createdAt?: string;
  completedAt?: string;
  readinessImpact?: ReadinessImpact;
  taskHistory?: TaskStatusEvent[];
  inspections?: InspectionEvent[];
};

export const TASK_STATUSES: TaskStatus[] = [
  'Belum dikerjakan',
  'Dikerjakan',
  'Menunggu pemeriksaan',
  'Selesai',
  'Dibatalkan',
];

export const TASK_HISTORY_LIMIT = 50;
export const INSPECTION_LIMIT = 50;

export const HOUSEKEEPING_KIND = 'Housekeeping';
export const MAINTENANCE_KIND = 'Maintenance';

const OPEN_STATUSES: TaskStatus[] = [
  'Belum dikerjakan',
  'Dikerjakan',
  'Menunggu pemeriksaan',
];

const TERMINAL_STATUSES: TaskStatus[] = ['Selesai', 'Dibatalkan'];

/**
 * Housekeeping transition table. `Menunggu pemeriksaan -> Selesai` is
 * deliberately absent: completion only happens through inspection PASS.
 * `Menunggu pemeriksaan -> Dikerjakan` is re-cleaning after a failed
 * inspection. `Dibatalkan` is automation-only and terminal.
 */
const HOUSEKEEPING_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  'Belum dikerjakan': ['Dikerjakan'],
  'Dikerjakan': ['Menunggu pemeriksaan'],
  'Menunggu pemeriksaan': ['Dikerjakan'],
  'Selesai': [],
  'Dibatalkan': [],
};

/**
 * Maintenance follows the same vocabulary but may complete directly from
 * `Menunggu pemeriksaan` without an inspection gate. Maintenance completion
 * never affects unit readiness.
 */
const MAINTENANCE_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  'Belum dikerjakan': ['Dikerjakan'],
  'Dikerjakan': ['Menunggu pemeriksaan'],
  'Menunggu pemeriksaan': ['Dikerjakan', 'Selesai'],
  'Selesai': [],
  'Dibatalkan': [],
};

export function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === 'string' && (TASK_STATUSES as string[]).includes(value);
}

/**
 * Kind-aware transition guard. `Dibatalkan` is reachable only by automation,
 * from any open status. Same-status transitions are allowed as no-ops so the
 * helper is idempotent.
 */
export function canTransitionTaskStatus(
  kind: unknown,
  from: unknown,
  to: unknown,
  source: TaskTransitionSource = 'operator',
): boolean {
  if (!isTaskStatus(from) || !isTaskStatus(to)) return false;
  if (from === to) return true;
  if (to === 'Dibatalkan') {
    return source === 'automation' && (OPEN_STATUSES as string[]).includes(from);
  }
  if ((TERMINAL_STATUSES as string[]).includes(from)) return false;
  const table = kind === MAINTENANCE_KIND ? MAINTENANCE_TRANSITIONS : HOUSEKEEPING_TRANSITIONS;
  return table[from].includes(to as TaskStatus);
}

/**
 * Applies a task transition in place and records one history entry.
 * Returns false (no mutation) for an invalid transition, and true without
 * side effects for a same-status replay (idempotent).
 *
 * History: newest first, capped at TASK_HISTORY_LIMIT, no Guest PII.
 */
export function transitionTask(
  task: { kind: string; status: string; taskHistory?: TaskStatusEvent[]; completedAt?: string },
  to: TaskStatus,
  source: TaskTransitionSource,
  reason?: string,
): boolean {
  if (!canTransitionTaskStatus(task.kind, task.status, to, source)) return false;
  const from = task.status;
  if (from === to) return true;
  task.status = to;
  const history: TaskStatusEvent[] = Array.isArray(task.taskHistory) ? task.taskHistory : [];
  const event: TaskStatusEvent = { from: from as TaskStatus, to, at: new Date().toISOString(), source };
  if (reason) event.reason = reason;
  history.unshift(event);
  task.taskHistory = history.slice(0, TASK_HISTORY_LIMIT);
  if (to === 'Selesai' && !task.completedAt) task.completedAt = new Date().toISOString();
  return true;
}

/* ------------------------------------------------------------- readiness */

/**
 * Whether an open task of this kind can keep a unit operationally not ready.
 * Explicit field wins; legacy tasks are inferred so that arrival-preparation
 * tasks (sourceKey `arrival:`) never block check-in, preserving PMS-2 behavior.
 */
export function taskAffectsReadiness(task: { kind: string; sourceKey?: string; readinessImpact?: ReadinessImpact }): ReadinessImpact {
  if (task.readinessImpact === 'blocking' || task.readinessImpact === 'none') return task.readinessImpact;
  if (task.kind !== HOUSEKEEPING_KIND) return 'none';
  if (task.sourceKey && task.sourceKey.startsWith('arrival:')) return 'none';
  return 'blocking';
}

export function isOpenTask(task: { status: string }): boolean {
  return !(TERMINAL_STATUSES as string[]).includes(task.status);
}

/**
 * True when the unit has a readiness-blocking housekeeping task still open.
 * Pure helper for derived UI/domain checks.
 */
export function hasOpenBlockingHousekeeping(
  tasks: ReadonlyArray<{ kind: string; status: string; unit: string; sourceKey?: string; readinessImpact?: ReadinessImpact }>,
  unitId: string,
): boolean {
  return tasks.some(
    (t) =>
      t.unit === unitId &&
      t.kind === HOUSEKEEPING_KIND &&
      taskAffectsReadiness(t) === 'blocking' &&
      isOpenTask(t),
  );
}

/**
 * Operational readiness = unit.clean === 'Siap' AND no blocking housekeeping
 * task still open. The existing check-in guard keeps reading unit.clean; this
 * helper is for derived presentation and domain checks only.
 */
export function unitIsReady(
  unit: { id: string; clean: string },
  tasks: ReadonlyArray<{ kind: string; status: string; unit: string; sourceKey?: string; readinessImpact?: ReadinessImpact }>,
): boolean {
  return unit.clean === 'Siap' && !hasOpenBlockingHousekeeping(tasks, unit.id);
}

/**
 * Units flagged `Perlu dibersihkan` with no blocking housekeeping task yet.
 * This is the checkout rule-off gap detector: the unit needs cleaning but no
 * task exists yet, so the operator must create one manually.
 */
export function unitsMissingHousekeepingTask(
  units: ReadonlyArray<{ id: string; clean: string }>,
  tasks: ReadonlyArray<{ kind: string; status: string; unit: string; sourceKey?: string; readinessImpact?: ReadinessImpact }>,
): string[] {
  return units
    .filter((u) => u.clean !== 'Siap' && !hasOpenBlockingHousekeeping(tasks, u.id))
    .map((u) => u.id);
}

/* ------------------------------------------------------------ inspection */

function requireInspectionable(task: { kind: string; status: string }): void {
  if (task.kind !== HOUSEKEEPING_KIND) throw Error('Pemeriksaan hanya berlaku untuk tugas housekeeping.');
  if (task.status !== 'Menunggu pemeriksaan') throw Error('Pemeriksaan hanya dapat dilakukan pada tugas yang menunggu pemeriksaan.');
}

function appendInspection(task: Task, event: InspectionEvent): InspectionEvent {
  const inspections: InspectionEvent[] = Array.isArray(task.inspections) ? task.inspections : [];
  inspections.unshift(event);
  task.inspections = inspections.slice(0, INSPECTION_LIMIT);
  return event;
}

function latestInspection(task: Task): InspectionEvent | undefined {
  return Array.isArray(task.inspections) && task.inspections.length ? task.inspections[0] : undefined;
}

/**
 * Records an inspection result on a housekeeping task waiting for inspection.
 *
 * PASS  -> appends the event, completes the task (the only route to `Selesai`)
 *          and stamps completedAt on first completion.
 * FAIL  -> appends the event only; the task stays
 *          `Menunggu pemeriksaan` and the unit stays not ready.
 *
 * Replaying PASS on an already completed task is a no-op: no duplicate event,
 * no duplicate history, no further mutation.
 */
export function recordInspection(
  task: Task,
  result: InspectionResult,
  opts: { at?: string; by?: string; note?: string; source?: TaskTransitionSource } = {},
): InspectionEvent | undefined {
  const at = opts.at || new Date().toISOString();
  const source: TaskTransitionSource = opts.source || 'operator';
  const note = opts.note ? String(opts.note).slice(0, 300) : undefined;
  const by = opts.by ? String(opts.by).slice(0, 100) : undefined;

  if (result === 'pass') {
    if (task.status === 'Selesai') return latestInspection(task);
    requireInspectionable(task);
    const event = appendInspection(task, { result: 'pass', at, ...(by ? { by } : {}), ...(note ? { note } : {}) });
    const from = task.status;
    task.status = 'Selesai';
    const history: TaskStatusEvent[] = Array.isArray(task.taskHistory) ? task.taskHistory : [];
    history.unshift({ from: from as TaskStatus, to: 'Selesai', at, source });
    task.taskHistory = history.slice(0, TASK_HISTORY_LIMIT);
    if (!task.completedAt) task.completedAt = at;
    return event;
  }

  requireInspectionable(task);
  return appendInspection(task, { result: 'fail', at, ...(by ? { by } : {}), ...(note ? { note } : {}) });
}

/**
 * Links a maintenance task created from a failed inspection back to the
 * inspection event that produced it.
 */
export function linkInspectionIssue(task: Task, issueTaskId: string): void {
  const latest = latestInspection(task);
  if (latest && !latest.issueTaskId) latest.issueTaskId = issueTaskId;
}

/* ------------------------------------------------------------- normalize */

/** Safe read accessors that never mutate legacy state. */
export function taskHistoryOf(task: { taskHistory?: TaskStatusEvent[] }): TaskStatusEvent[] {
  return Array.isArray(task.taskHistory) ? task.taskHistory : [];
}

export function inspectionsOf(task: { inspections?: InspectionEvent[] }): InspectionEvent[] {
  return Array.isArray(task.inspections) ? task.inspections : [];
}

/* ------------------------------------------------------------- priority */

export function isArrivalPrepTask(task: { sourceKey?: string }): boolean {
  return !!(task.sourceKey && task.sourceKey.startsWith('arrival:'));
}

/**
 * Effective priority is derived, not stored, so urgency can never go stale:
 *   explicit urgent flag, or same-day turnover, or arrival-prep due today.
 */
export function effectiveTaskPriority(
  task: { priority?: TaskPriority; sourceKey?: string; unit: string },
  bookings: ReadonlyArray<{ unit: string; status: string; start: string; end: string }>,
  today: string,
): TaskPriority {
  if (task.priority === 'urgent') return 'urgent';
  const sameUnit = bookings.filter((b) => b.unit === task.unit);
  const arrivalToday = sameUnit.some((b) => b.status === 'Confirmed' && b.start === today);
  const departureToday = sameUnit.some((b) => b.status === 'Checked-in' && b.end === today);
  if (arrivalToday && departureToday) return 'urgent';
  if (isArrivalPrepTask(task) && arrivalToday) return 'urgent';
  return 'normal';
}
