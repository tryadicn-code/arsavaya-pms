/**
 * ARSAVAYA PMS — operational presentation selectors (PMS-2B + PMS-3B).
 *
 * Pure helpers only. This module NEVER mutates state and NEVER duplicates the
 * transition table: action helpers derive every result from
 * operatorTransitions() in lib/booking-status.ts, and availability semantics
 * stay owned by blocksAvailability(). PMS-3B task selectors derive from the
 * task domain in lib/task-status.ts.
 *
 * Presentation layer for arrivals / stay / departure, dashboard KPIs,
 * reservation filters, status badges, status-history timeline, housekeeping /
 * inspection / maintenance lists and same-day turnover.
 */
import {BOOKING_STATUSES, isBookingStatus, operatorTransitions} from './booking-status.ts';
import type {BookingStatus, BookingStatusEvent} from './booking-status.ts';
import {
  HOUSEKEEPING_KIND,
  MAINTENANCE_KIND,
  hasOpenBlockingHousekeeping,
  isOpenTask,
  unitIsReady,
  taskAffectsReadiness,
  unitsMissingHousekeepingTask,
  effectiveTaskPriority,
  isArrivalPrepTask,
} from './task-status.ts';

export type OperationalBooking = {
  id: string;
  unit?: string;
  status: string;
  start?: string;
  end?: string;
  guestId?: string;
  total?: number;
  statusHistory?: BookingStatusEvent[];
};

export type OperationalTask = {
  id: string;
  unit: string;
  kind: string;
  status: string;
  sourceKey?: string;
  readinessImpact?: 'blocking' | 'none';
};

export type OperationalUnit = {id: string; clean: string};

export {unitsMissingHousekeepingTask, effectiveTaskPriority, isArrivalPrepTask, taskAffectsReadiness};

/** Statuses that represent real, billable stays for guest value. */
export const GUEST_VALUE_STATUSES: BookingStatus[] = ['Confirmed', 'Checked-in', 'Checked-out'];

/**
 * WITA (Asia/Makassar, UTC+8, no DST) date-only formatter.
 *
 * Date-only values are anchored at noon WITA before formatting so the calendar
 * day can never shift, regardless of the browser/Node timezone. The result is
 * byte-identical for the same input anywhere in the world.
 */
export function formatDateWITA(value: string, options?: Intl.DateTimeFormatOptions): string {
  const d = String(value || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const ms = Date.parse(d + 'T12:00:00+08:00');
  if (!Number.isFinite(ms)) return d;
  return new Intl.DateTimeFormat('id-ID', {timeZone: 'Asia/Makassar', day: 'numeric', month: 'short', ...options}).format(new Date(ms));
}

/** WITA formatter for full ISO timestamps (status history, audit rows). */
export function formatDateTimeWITA(value: string, options?: Intl.DateTimeFormatOptions): string {
  const ms = Date.parse(String(value || ''));
  if (!Number.isFinite(ms)) return String(value || '—');
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Makassar',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  }).format(new Date(ms));
}

/* ---------------------------------------------------------- operational lists */

/** Confirmed reservations starting exactly today. */
export function arrivalsToday<T extends OperationalBooking>(bookings: ReadonlyArray<T>, today: string): T[] {
  return bookings.filter((b) => b.status === 'Confirmed' && b.start === today);
}

/** Guests currently in house. */
export function inHouse<T extends OperationalBooking>(bookings: ReadonlyArray<T>): T[] {
  return bookings.filter((b) => b.status === 'Checked-in');
}

/** Checked-in reservations ending exactly today. */
export function departuresToday<T extends OperationalBooking>(bookings: ReadonlyArray<T>, today: string): T[] {
  return bookings.filter((b) => b.status === 'Checked-in' && b.end === today);
}

/** Reservations awaiting operator confirmation. */
export function pendingReservations<T extends OperationalBooking>(bookings: ReadonlyArray<T>): T[] {
  return bookings.filter((b) => b.status === 'Pending');
}

/** Total billable value of one guest, real stays only (PMS-2B fix). */
export function guestValue(bookings: ReadonlyArray<OperationalBooking>, guestId: string): number {
  if (!guestId) return 0;
  return bookings
    .filter((b) => b.guestId === guestId && (GUEST_VALUE_STATUSES as string[]).includes(b.status))
    .reduce((sum, b) => sum + (typeof b.total === 'number' ? b.total : 0), 0);
}

/* ------------------------------------------------------------------- actions */

const PRIMARY_PRIORITY: BookingStatus[] = ['Checked-in', 'Confirmed', 'Checked-out'];
const DESTRUCTIVE_TARGETS: BookingStatus[] = ['Cancelled', 'No-show'];

/** The single positive next step an operator should take, or undefined. */
export function getPrimaryOperatorAction(status: string): BookingStatus | undefined {
  if (!isBookingStatus(status)) return undefined;
  const allowed = operatorTransitions(status);
  return PRIMARY_PRIORITY.find((t) => allowed.includes(t));
}

/** Destructive transitions offered separately so they cannot be mis-tapped. */
export function getDestructiveOperatorActions(status: string): BookingStatus[] {
  if (!isBookingStatus(status)) return [];
  return operatorTransitions(status).filter((t) => (DESTRUCTIVE_TARGETS as string[]).includes(t));
}

/** Non-primary, non-destructive transitions (e.g. Confirmed -> Cancelled is destructive). */
export function getSecondaryOperatorActions(status: string): BookingStatus[] {
  if (!isBookingStatus(status)) return [];
  const primary = getPrimaryOperatorAction(status);
  return operatorTransitions(status).filter((t) => t !== primary && !(DESTRUCTIVE_TARGETS as string[]).includes(t));
}

/* ------------------------------------------------------------- presentation */

const STATUS_LABELS: Record<BookingStatus, string> = {
  Pending: 'Menunggu konfirmasi',
  Hold: 'Ditahan sementara',
  Confirmed: 'Terkonfirmasi',
  'Checked-in': 'Sedang menginap',
  'Checked-out': 'Selesai menginap',
  Cancelled: 'Dibatalkan',
  'No-show': 'Tidak datang',
  Expired: 'Kedaluwarsa',
};

export type StatusTone = 'green' | 'blue' | 'amber' | 'red' | 'muted';

const STATUS_TONES: Record<BookingStatus, StatusTone> = {
  Pending: 'amber',
  Hold: 'amber',
  Confirmed: 'green',
  'Checked-in': 'blue',
  'Checked-out': 'muted',
  Cancelled: 'red',
  'No-show': 'red',
  Expired: 'muted',
};

export function reservationStatusLabel(status: string): string {
  return isBookingStatus(status) ? STATUS_LABELS[status] : String(status || '');
}

export function reservationStatusTone(status: string): StatusTone {
  return isBookingStatus(status) ? STATUS_TONES[status] : 'muted';
}

/** UI label for an operator action button. */
export function operatorActionLabel(status: string): string {
  if (status === 'Checked-in') return 'Check-in';
  if (status === 'Checked-out') return 'Check-out';
  if (status === 'Confirmed') return 'Konfirmasi';
  if (status === 'Cancelled') return 'Batalkan';
  if (status === 'No-show') return 'Tandai tidak datang';
  return reservationStatusLabel(status);
}

/* ------------------------------------------------- reservation list filters */

export type ReservationFilterGroup = 'Semua' | 'Aktif' | 'Menunggu' | 'Selesai';

export const RESERVATION_FILTER_GROUPS: ReadonlyArray<{
  key: ReservationFilterGroup;
  label: string;
  statuses: BookingStatus[];
}> = [
  {key: 'Semua', label: 'Semua', statuses: [...BOOKING_STATUSES]},
  {key: 'Aktif', label: 'Aktif', statuses: ['Confirmed', 'Checked-in']},
  {key: 'Menunggu', label: 'Menunggu', statuses: ['Pending', 'Hold']},
  {key: 'Selesai', label: 'Selesai', statuses: ['Checked-out', 'Cancelled', 'No-show', 'Expired']},
];

/** Statuses visible under a group; undefined for unknown groups. */
export function statusesForFilter(group: string): BookingStatus[] | undefined {
  return RESERVATION_FILTER_GROUPS.find((g) => g.key === group)?.statuses;
}

/**
 * Every BookingStatus covered exactly once by the non-'Semua' groups.
 * Used by regression tests to prove full coverage without overlap.
 */
export function filterGroupCoverage(): BookingStatus[] {
  return RESERVATION_FILTER_GROUPS.filter((g) => g.key !== 'Semua').flatMap((g) => g.statuses);
}

/** True when a booking is visible under the given filter group. */
export function matchesFilterGroup(status: string, group: string): boolean {
  if (group === 'Semua') return true;
  const statuses = statusesForFilter(group);
  return statuses ? (statuses as string[]).includes(status) : false;
}

/* ------------------------------------------------------- status history UI */

export const STATUS_SOURCE_LABELS: Record<string, string> = {
  operator: 'Operator',
  beds24: 'Beds24',
  automation: 'Otomatis',
};

export function statusSourceLabel(source: string): string {
  return STATUS_SOURCE_LABELS[source] || String(source || '');
}

/* ------------------------------------------------------ PMS-3B task selectors */

/** Open housekeeping tasks (any non-terminal status). */
export function housekeepingPending<T extends OperationalTask>(tasks: ReadonlyArray<T>): T[] {
  return tasks.filter((t) => t.kind === HOUSEKEEPING_KIND && isOpenTask(t));
}

/** Housekeeping tasks waiting for inspection. */
export function inspectionPending<T extends OperationalTask>(tasks: ReadonlyArray<T>): T[] {
  return tasks.filter((t) => t.kind === HOUSEKEEPING_KIND && t.status === 'Menunggu pemeriksaan');
}

/** Open maintenance tasks. */
export function maintenanceOpen<T extends OperationalTask>(tasks: ReadonlyArray<T>): T[] {
  return tasks.filter((t) => t.kind === MAINTENANCE_KIND && isOpenTask(t));
}

/** Units that are not operationally ready right now. */
export function unitsNotReady<T extends OperationalUnit>(units: ReadonlyArray<T>, tasks: ReadonlyArray<OperationalTask>): T[] {
  return units.filter((u) => !unitIsReady(u, tasks));
}


export type Turnover<T> = {unit: string; departure: T; arrival: T};

/**
 * Same-day turnover: a unit with a departure today AND an arrival today.
 * Pure derived state only; never a scheduler.
 */
export function turnoversToday<T extends OperationalBooking>(bookings: ReadonlyArray<T>, today: string): Turnover<T>[] {
  const departures = departuresToday(bookings, today);
  if (!departures.length) return [];
  return arrivalsToday(bookings, today)
    .map((arrival) => {
      const departure = departures.find((d) => d.unit === arrival.unit);
      return departure ? {unit: arrival.unit, departure, arrival} : null;
    })
    .filter((x): x is Turnover<T> => x !== null);
}
