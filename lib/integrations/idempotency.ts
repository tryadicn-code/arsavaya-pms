export type EntityIdentityInput = {
  provider: string;
  accountId: string;
  entityType: string;
  externalId: string;
};

export type EventIdentityInput = EntityIdentityInput & {
  eventId?: string | null;
  revision?: string | null;
  externalUpdatedAt?: string | null;
  fingerprint?: string | null;
};

function assertField(value: unknown, name: string): asserts value is string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error('Idempotency: "' + name + '" is required.');
  }
}

export function buildEntityKey(input: EntityIdentityInput): string {
  assertField(input.provider, 'provider');
  assertField(input.accountId, 'accountId');
  assertField(input.entityType, 'entityType');
  assertField(input.externalId, 'externalId');
  return ['entity', input.provider, input.accountId, input.entityType, input.externalId].join('|');
}

export function buildEventKey(input: EventIdentityInput): string {
  assertField(input.provider, 'provider');
  assertField(input.accountId, 'accountId');
  assertField(input.entityType, 'entityType');
  assertField(input.externalId, 'externalId');

  if (input.eventId) {
    return ['event', input.provider, input.accountId, 'id', input.eventId].join('|');
  }
  if (input.fingerprint) {
    return ['event', input.provider, input.accountId, 'fp', input.fingerprint].join('|');
  }
  if (input.revision) {
    return ['event', input.provider, input.accountId, 'rev', input.entityType, input.externalId, input.revision].join('|');
  }
  if (input.externalUpdatedAt) {
    return ['event', input.provider, input.accountId, 'ts', input.entityType, input.externalId, input.externalUpdatedAt].join('|');
  }
  throw new Error('buildEventKey requires at least one of: eventId, fingerprint, revision, externalUpdatedAt.');
}