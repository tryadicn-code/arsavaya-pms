import type { CanonicalReservation, ReconciliationStatus } from './types.ts';
import type { UnitMapping } from './unit-mapping.ts';
import { findMappingByExternal } from './unit-mapping.ts';
import { buildEntityKey } from './idempotency.ts';

export type PriorEvent = {
  entityKey: string;
  externalId: string;
  externalUpdatedAt?: string | null;
  externalRevision?: string | null;
  localEntityId?: string | null;
  status: ReconciliationStatus;
  processedAt?: string | null;
};

export type LocalBookingView = {
  id: string;
  unitId: string;
  start: string;
  end: string;
  status: string;
  linkedExternalProvider?: string;
  linkedExternalId?: string;
};

export type ReconciliationContext = {
  provider: string;
  accountId: string;
  workspace: string;
  mappings: readonly UnitMapping[];
  priorEvents: readonly PriorEvent[];
  localBookings: readonly LocalBookingView[];
};

export type ReconciliationDecision = {
  status: ReconciliationStatus;
  entityKey: string;
  eventKey: string;
  localUnitId?: string;
  localEntityId?: string;
  reason?: string;
};

const ACTIVE_LOCAL_STATUSES = new Set(['Confirmed', 'Checked-in', 'Hold']);

const overlaps = (aStart: string, aEnd: string, bStart: string, bEnd: string): boolean =>
  aStart < bEnd && aEnd > bStart;

function parseTime(s: string | null | undefined): number | null {
  if (!s) return null;
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : null;
}

function isNewerVersion(incoming: CanonicalReservation, prior: PriorEvent): boolean {
  const inTime = parseTime(incoming.externalUpdatedAt);
  const priorTime = parseTime(prior.externalUpdatedAt);

  if (priorTime === null && inTime === null) {
    if (prior.externalRevision && incoming.externalRevision) {
      return prior.externalRevision !== incoming.externalRevision;
    }
    return false;
  }
  if (priorTime === null) return true;
  if (inTime === null) return false;
  return inTime > priorTime;
}

export function reconcile(
  canonical: CanonicalReservation,
  ctx: ReconciliationContext,
  eventKey: string,
): ReconciliationDecision {
  const entityKey = buildEntityKey({
    provider: ctx.provider,
    accountId: ctx.accountId,
    entityType: 'reservation',
    externalId: canonical.externalId,
  });

  const prior = ctx.priorEvents.find((e) => e.entityKey === entityKey);

  if (canonical.status === 'CANCELLED') {
    if (!prior) {
      return {
        status: 'NEEDS_REVIEW',
        entityKey,
        eventKey,
        reason: 'Cancellation for an external reservation that has never been seen locally.',
      };
    }
    return {
      status: 'CANCELLED',
      entityKey,
      eventKey,
      localEntityId: prior.localEntityId ?? undefined,
    };
  }

  const mapping = findMappingByExternal(ctx.mappings, canonical.externalUnitId);
  if (!mapping) {
    return {
      status: 'NEEDS_REVIEW',
      entityKey,
      eventKey,
      reason: 'No confirmed unit mapping for external unit ' + canonical.externalUnitId + '.',
    };
  }
  const localUnitId = mapping.localUnitId;

  if (prior) {
    const newer = isNewerVersion(canonical, prior);
    return {
      status: newer ? 'UPDATED' : 'MATCHED',
      entityKey,
      eventKey,
      localUnitId,
      localEntityId: prior.localEntityId ?? undefined,
    };
  }

  const conflict = ctx.localBookings.find((b) => {
    if (b.unitId !== localUnitId) return false;
    if (!ACTIVE_LOCAL_STATUSES.has(b.status)) return false;
    if (b.linkedExternalProvider === ctx.provider && b.linkedExternalId === canonical.externalId) {
      return false;
    }
    return overlaps(b.start, b.end, canonical.arrival, canonical.departure);
  });

  if (conflict) {
    return {
      status: 'CONFLICT',
      entityKey,
      eventKey,
      localUnitId,
      localEntityId: conflict.id,
      reason: 'Overlaps local booking ' + conflict.id + '.',
    };
  }

  return { status: 'NEW', entityKey, eventKey, localUnitId };
}