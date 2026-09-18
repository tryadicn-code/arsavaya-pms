/**
 * ARSAVAYA PMS — booking status domain (single source of truth).
 *
 * This module is the lowest layer of the PMS domain: it imports nothing from
 * the rest of the app so that pms.ts, the Beds24 integration and the UI can all
 * derive transition rules, availability semantics and status history from one
 * place instead of duplicating them.
 */

export type BookingStatus =
  | 'Pending'
  | 'Hold'
  | 'Confirmed'
  | 'Checked-in'
  | 'Checked-out'
  | 'Cancelled'
  | 'No-show'
  | 'Expired';

export type BookingStatusSource = 'operator' | 'beds24' | 'automation';

export type BookingStatusEvent = {
  from?: BookingStatus;
  to: BookingStatus;
  at: string;
  source: BookingStatusSource;
  reason?: string;
};

export const BOOKING_STATUSES: BookingStatus[] = [
  'Pending',
  'Hold',
  'Confirmed',
  'Checked-in',
  'Checked-out',
  'Cancelled',
  'No-show',
  'Expired',
];

/**
 * Central transition table. Terminal states have no outgoing transitions.
 * 'Expired' is automation-only (Hold expiry); it is never offered to operators.
 */
export const ALLOWED_BOOKING_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  Pending: ['Confirmed', 'Cancelled'],
  Hold: ['Confirmed', 'Cancelled', 'Expired'],
  Confirmed: ['Checked-in', 'Cancelled', 'No-show'],
  'Checked-in': ['Checked-out'],
  'Checked-out': [],
  Cancelled: [],
  'No-show': [],
  Expired: [],
};

/** Deterministic local date (Asia/Makassar) — kept private to avoid import cycles. */
function localToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Makassar',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function isBookingStatus(value: unknown): value is BookingStatus {
  return typeof value === 'string' && (BOOKING_STATUSES as string[]).includes(value);
}

export function canTransitionBookingStatus(from: unknown, to: unknown): boolean {
  if (!isBookingStatus(from) || !isBookingStatus(to)) return false;
  return ALLOWED_BOOKING_TRANSITIONS[from].includes(to);
}

/**
 * Transitions an operator may initiate from the UI. Automation-only targets
 * (Hold -> Expired) are hidden so the interface cannot fire them by hand.
 */
export function operatorTransitions(from: BookingStatus): BookingStatus[] {
  if (!isBookingStatus(from)) return [];
  return ALLOWED_BOOKING_TRANSITIONS[from].filter((t) => t !== 'Expired');
}

/**
 * Availability / conflict semantics: which bookings occupy a unit.
 * Named for its business meaning instead of a generic "isActive" so call sites
 * cannot accidentally reuse it for occupancy, revenue or reporting.
 *
 * Confirmed / Checked-in        -> blocks
 * Hold with unexpired holdUntil -> blocks
 * everything else (Pending, Checked-out, Cancelled, No-show, Expired) -> free
 */
export function blocksAvailability(
  booking: { status: string; holdUntil?: string },
  now: number = Date.now(),
): boolean {
  if (booking.status === 'Confirmed' || booking.status === 'Checked-in') return true;
  if (booking.status === 'Hold') {
    return !!booking.holdUntil && Date.parse(booking.holdUntil) > now;
  }
  return false;
}

export const BOOKING_STATUS_HISTORY_LIMIT = 50;

/**
 * Applies a status transition in place and records one history entry.
 * Returns false (no mutation) when the transition is not allowed or the No-show
 * guard (arrival date must be reached) rejects it, so callers can fall back to
 * a needs-review path instead of leaving partial state behind.
 *
 * History: newest first, capped at BOOKING_STATUS_HISTORY_LIMIT, no Guest PII.
 */
export function transitionBooking(
  booking: {
    status: string;
    start?: string;
    statusHistory?: BookingStatusEvent[];
  },
  to: BookingStatus,
  source: BookingStatusSource,
  reason?: string,
): boolean {
  if (!isBookingStatus(booking.status)) return false;
  const from: BookingStatus = booking.status;
  if (!canTransitionBookingStatus(from, to)) return false;
  if (to === 'No-show' && booking.start !== undefined && String(booking.start) > localToday()) {
    return false;
  }
  booking.status = to;
  const history: BookingStatusEvent[] = Array.isArray(booking.statusHistory)
    ? booking.statusHistory
    : [];
  const event: BookingStatusEvent = {
    from,
    to,
    at: new Date().toISOString(),
    source,
  };
  if (reason) event.reason = reason;
  history.unshift(event);
  booking.statusHistory = history.slice(0, BOOKING_STATUS_HISTORY_LIMIT);
  return true;
}
