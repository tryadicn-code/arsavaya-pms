/**
 * Apply CanonicalReservation to local PMS workspace state.
 * Preserves ARSAVAYA-owned fields; only updates provider-owned fields.
 */
import type { State, Booking } from '../../pms.ts';
import type { CanonicalReservation } from '../types.ts';
import type { UnitMapping } from '../unit-mapping.ts';

export type ApplyResult =
  | { ok: true; action: 'created' | 'updated' | 'cancelled' | 'unchanged'; state: State; localEntityId: string }
  | { ok: false; reason: 'no_mapping' | 'unknown_unit' | 'conflict' | 'validation_error'; detail?: string };

const ACTIVE = new Set(['Confirmed', 'Checked-in', 'Hold']);

function activeBooking(b: Booking): boolean {
  if (b.status === 'Hold' && b.holdUntil) return Date.parse(b.holdUntil) > Date.now();
  return ACTIVE.has(b.status);
}

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && aEnd > bStart;
}

function nowIso(): string {
  return new Date().toISOString();
}

function newLocalId(): string {
  return 'RSV-' + crypto.randomUUID().slice(0, 8).toUpperCase();
}

function validateDates(start: string, end: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) return false;
  if (!Number.isFinite(Date.parse(start + 'T00:00:00Z'))) return false;
  if (!Number.isFinite(Date.parse(end + 'T00:00:00Z'))) return false;
  if (end <= start) return false;
  const nights = Math.round(
    (Date.parse(end + 'T00:00:00Z') - Date.parse(start + 'T00:00:00Z')) / 86400000,
  );
  if (nights <= 0 || nights > 365) return false;
  return true;
}

function findLocalBookingByExternal(
  state: State,
  localEntityId: string | null | undefined,
): Booking | undefined {
  if (!localEntityId) return undefined;
  return state.bookings.find((b) => b.id === localEntityId);
}

export function applyCanonicalReservation(
  source: State,
  canonical: CanonicalReservation,
  mapping: UnitMapping | null,
  existingLocalEntityId: string | null,
): ApplyResult {
  if (!mapping || !mapping.confirmed) return { ok: false, reason: 'no_mapping' };

  const state = structuredClone(source);
  const unit = state.units.find((u) => u.id === mapping.localUnitId);
  if (!unit) return { ok: false, reason: 'unknown_unit' };

  if (!validateDates(canonical.arrival, canonical.departure)) {
    return { ok: false, reason: 'validation_error', detail: 'invalid dates from provider' };
  }

  const guests = Math.max(1, (canonical.adults ?? 1) + (canonical.children ?? 0));
  if (guests > unit.capacity) {
    return { ok: false, reason: 'validation_error', detail: 'guest count exceeds unit capacity' };
  }

  const channel = canonical.externalChannel || 'Unknown';
  const total = typeof canonical.price === 'number' ? canonical.price : 0;

  // -------- cancellation --------
  if (canonical.status === 'CANCELLED') {
    const b = findLocalBookingByExternal(state, existingLocalEntityId);
    if (!b) {
      return { ok: false, reason: 'validation_error', detail: 'no local booking to cancel' };
    }
    if (b.status === 'Cancelled') {
      return { ok: true, action: 'unchanged', state, localEntityId: b.id };
    }
    b.status = 'Cancelled';
    state.audit.unshift({
      id: crypto.randomUUID(),
      date: nowIso(),
      action: `integration: cancel ${b.id} (Beds24 ${canonical.externalId})`,
    });
    return { ok: true, action: 'cancelled', state, localEntityId: b.id };
  }

  // -------- update existing --------
  if (existingLocalEntityId) {
    const b = findLocalBookingByExternal(state, existingLocalEntityId);
    if (!b) {
      return { ok: false, reason: 'validation_error', detail: 'linked local booking missing' };
    }

    const collision = state.bookings.find(
      (x) =>
        x.id !== b.id &&
        x.unit === mapping.localUnitId &&
        activeBooking(x) &&
        overlaps(x.start, x.end, canonical.arrival, canonical.departure),
    );
    if (collision) return { ok: false, reason: 'conflict', detail: `overlaps ${collision.id}` };

    const before = {
      unit: b.unit,
      guest: b.guest,
      phone: b.phone,
      start: b.start,
      end: b.end,
      guests: b.guests,
      channel: b.channel,
      total: b.total,
    };
    b.unit = mapping.localUnitId;
    b.guest = canonical.guestName;
    b.phone = canonical.guestPhone ?? b.phone ?? '';
    b.start = canonical.arrival;
    b.end = canonical.departure;
    b.guests = guests;
    b.channel = channel;
    b.total = total;

    const changed = (Object.keys(before) as (keyof typeof before)[]).some(
      (k) => (b as unknown as Record<string, unknown>)[k] !== before[k],
    );
    if (!changed) return { ok: true, action: 'unchanged', state, localEntityId: b.id };

    state.audit.unshift({
      id: crypto.randomUUID(),
      date: nowIso(),
      action: `integration: update ${b.id} (Beds24 ${canonical.externalId})`,
    });
    return { ok: true, action: 'updated', state, localEntityId: b.id };
  }

  // -------- create new --------
  const collision = state.bookings.find(
    (x) =>
      x.unit === mapping.localUnitId &&
      activeBooking(x) &&
      overlaps(x.start, x.end, canonical.arrival, canonical.departure),
  );
  if (collision) return { ok: false, reason: 'conflict', detail: `overlaps ${collision.id}` };

  const id = newLocalId();
  const booking: Booking = {
    id,
    unit: mapping.localUnitId,
    guest: canonical.guestName,
    phone: canonical.guestPhone ?? '',
    start: canonical.arrival,
    end: canonical.departure,
    guests,
    channel,
    status: 'Confirmed',
    total,
    note: `Beds24 ${canonical.externalId}${
      canonical.externalReference ? ' / ' + canonical.externalReference : ''
    }`,
    created: nowIso(),
  };
  state.bookings.push(booking);
  state.audit.unshift({
    id: crypto.randomUUID(),
    date: nowIso(),
    action: `integration: create ${id} from Beds24 ${canonical.externalId}`,
  });
  return { ok: true, action: 'created', state, localEntityId: id };
}