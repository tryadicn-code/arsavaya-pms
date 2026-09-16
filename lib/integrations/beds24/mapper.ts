/**
 * Beds24 â†’ Canonical mapper.
 * VERIFIED field mappings per Section 9 of reference doc.
 */
import {
  BEDS24_API_SOURCE,
  Beds24BookingSchema,
  Beds24PropertySchema,
} from './types.ts';
import type {
  CanonicalProperty,
  CanonicalReservation,
  CanonicalReservationStatus,
  CanonicalUnit,
} from '../types.ts';

const PROVIDER = 'beds24';

export function mapBeds24Status(raw: string | null | undefined): CanonicalReservationStatus {
  const s = (raw ?? '').toLowerCase().trim();
  if (s === 'confirmed') return 'CONFIRMED';
  if (s === 'cancelled' || s === 'black') return 'CANCELLED';
  if (s === 'new' || s === 'request' || s === 'inquiry') return 'PENDING';
  if (s === 'no_show' || s === 'noshow') return 'NO_SHOW';
  return 'UNKNOWN';
}

export function resolveChannel(apiSourceId?: number | null, apiSource?: string | null): string {
  if (typeof apiSourceId === 'number' && BEDS24_API_SOURCE[apiSourceId]) {
    return BEDS24_API_SOURCE[apiSourceId];
  }
  const s = (apiSource ?? '').trim();
  if (!s) return 'Unknown';
  // Beds24 sometimes returns 'Direct' â€” normalize capitalization
  if (s.toLowerCase() === 'direct') return 'Direct';
  return s;
}

function combineName(first?: string | null, last?: string | null): string {
  const f = (first ?? '').trim();
  const l = (last ?? '').trim();
  const full = [f, l].filter((x) => x.length > 0).join(' ');
  return full.length > 0 ? full : 'Tamu Beds24';
}

function pickPhone(phone?: string | null, mobile?: string | null): string | undefined {
  const p = (phone ?? '').trim();
  const m = (mobile ?? '').trim();
  return p || m || undefined;
}

export type MapResult<T> = { ok: true; value: T } | { ok: false; error: string };

export function mapBeds24Booking(raw: unknown): MapResult<CanonicalReservation> {
  const parsed = Beds24BookingSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.message };
  const b = parsed.data;

  if (!b.id) return { ok: false, error: 'booking id missing' };
  if (!b.propertyId || !b.roomId) return { ok: false, error: 'propertyId/roomId missing' };
  if (!b.arrival || !b.departure) return { ok: false, error: 'arrival/departure missing' };

  // IMPORTANT: externalUnitId is ONLY the Beds24 roomId.
  // It MUST match channel_manager_unit_mappings.external_unit_id.
  // The propertyId is preserved separately via externalPropertyId.
  const externalUnitId = b.roomId;
  const status = mapBeds24Status(b.status);
  const channel = resolveChannel(b.apiSourceId, b.apiSource);
  const adults = typeof b.numAdult === 'number' && b.numAdult > 0 ? b.numAdult : 1;
  const children = typeof b.numChild === 'number' && b.numChild >= 0 ? b.numChild : 0;

  return {
    ok: true,
    value: {
      provider: PROVIDER,
      externalId: b.id,
      externalReference: b.apiReference ?? b.reference ?? undefined,
      externalChannel: channel,
      externalUnitId,
      externalPropertyId: b.propertyId ?? undefined,
      arrival: b.arrival,
      departure: b.departure,
      guestName: combineName(b.firstName, b.lastName),
      guestEmail: b.email ?? undefined,
      guestPhone: pickPhone(b.phone, b.mobile),
      adults,
      children,
      status,
      price: typeof b.price === 'number' ? b.price : undefined,
      currency: undefined,
      createdAt: b.bookingTime ?? undefined,
      externalUpdatedAt: b.modifiedTime ?? undefined,
    },
  };
}

export function mapBeds24Properties(raw: unknown[]): {
  properties: CanonicalProperty[];
  units: CanonicalUnit[];
  errors: string[];
} {
  const properties: CanonicalProperty[] = [];
  const units: CanonicalUnit[] = [];
  const errors: string[] = [];
  for (const item of raw) {
    const parsed = Beds24PropertySchema.safeParse(item);
    if (!parsed.success) { errors.push(parsed.error.message); continue; }
    const p = parsed.data;
    properties.push({
      provider: PROVIDER,
      externalId: p.id,
      name: p.name ?? `Property ${p.id}`,
    });
    for (const r of p.roomTypes ?? []) {
      units.push({
        provider: PROVIDER,
        externalId: r.id,
        propertyExternalId: p.id,
        name: r.name ?? `Room ${r.id}`,
      });
    }
  }
  return { properties, units, errors };
}