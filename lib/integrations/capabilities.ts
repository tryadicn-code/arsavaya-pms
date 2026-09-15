/**
 * Provider capability constants.
 * A provider declares which capabilities it supports so that UI and
 * integration logic never expose controls for unsupported features.
 */
export const CAPABILITY = {
  reservationsRead: 'reservations.read',
  reservationsWrite: 'reservations.write',
  reservationsCancel: 'reservations.cancel',
  propertiesRead: 'properties.read',
  unitsRead: 'units.read',
  availabilityRead: 'availability.read',
  availabilityWrite: 'availability.write',
  ratesRead: 'rates.read',
  ratesWrite: 'rates.write',
  minimumStayRead: 'minimumStay.read',
  minimumStayWrite: 'minimumStay.write',
  restrictionsRead: 'restrictions.read',
  restrictionsWrite: 'restrictions.write',
  webhooks: 'webhooks',
  incrementalSync: 'incrementalSync',
  messages: 'messages',
} as const;

export type Capability = (typeof CAPABILITY)[keyof typeof CAPABILITY];

export type CapabilitySet = ReadonlySet<Capability>;

export function capabilitySet(...caps: Capability[]): CapabilitySet {
  return new Set(caps);
}

export function hasCapability(set: CapabilitySet, cap: Capability): boolean {
  return set.has(cap);
}

export function missingCapabilities(
  set: CapabilitySet,
  needed: readonly Capability[],
): Capability[] {
  return needed.filter((c) => !set.has(c));
}