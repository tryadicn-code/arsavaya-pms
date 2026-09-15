export type UnitMapping = {
  id: string;
  accountId: string;
  workspace: string;
  localUnitId: string;
  externalPropertyId: string;
  externalUnitId: string;
  confirmed: boolean;
  createdAt: string;
  updatedAt: string;
};

export function findMappingByLocal(
  mappings: readonly UnitMapping[],
  localUnitId: string,
): UnitMapping | undefined {
  return mappings.find((m) => m.localUnitId === localUnitId);
}

export function findMappingByExternal(
  mappings: readonly UnitMapping[],
  externalUnitId: string,
): UnitMapping | undefined {
  return mappings.find((m) => m.externalUnitId === externalUnitId);
}

export function createUnitMapping(input: {
  id: string;
  accountId: string;
  workspace: string;
  localUnitId: string;
  externalPropertyId: string;
  externalUnitId: string;
  confirmed?: boolean;
  now?: string;
}): UnitMapping {
  const now = input.now ?? new Date().toISOString();
  return {
    id: input.id,
    accountId: input.accountId,
    workspace: input.workspace,
    localUnitId: input.localUnitId,
    externalPropertyId: input.externalPropertyId,
    externalUnitId: input.externalUnitId,
    confirmed: input.confirmed ?? false,
    createdAt: now,
    updatedAt: now,
  };
}

export function suggestMappings(
  localUnits: readonly { id: string; name: string }[],
  externalUnits: readonly { externalId: string; propertyExternalId: string; name: string }[],
): Array<{
  localUnitId: string;
  externalPropertyId: string;
  externalUnitId: string;
  score: number;
}> {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const out: Array<{
    localUnitId: string;
    externalPropertyId: string;
    externalUnitId: string;
    score: number;
  }> = [];
  for (const lu of localUnits) {
    const a = normalize(lu.name);
    for (const eu of externalUnits) {
      const b = normalize(eu.name);
      if (!a || !b) continue;
      const score = a === b ? 1 : a.includes(b) || b.includes(a) ? 0.7 : 0;
      if (score > 0) {
        out.push({
          localUnitId: lu.id,
          externalPropertyId: eu.propertyExternalId,
          externalUnitId: eu.externalId,
          score,
        });
      }
    }
  }
  return out.sort((x, y) => y.score - x.score);
}