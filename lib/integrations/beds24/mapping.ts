/**
 * Mapping-save decision logic (pure, no I/O).
 *
 * Rules:
 *   1. Exact same confirmed mapping exists → 'unchanged' (idempotent 200).
 *   2. Same external unit → different local unit → 'conflict-external' (409).
 *   3. Same local unit → different external unit → 'conflict-local' (409).
 *   4. Otherwise → 'create'.
 *
 * Caller is responsible for:
 *   - Persisting new mappings only when decision.kind === 'create'.
 *   - Returning proper HTTP status based on decision kind.
 */
import type { UnitMapping } from '../unit-mapping.ts';

export type MappingSaveInput = {
  localUnitId: string;
  externalPropertyId: string;
  externalUnitId: string;
};

export type MappingSaveDecision =
  | { kind: 'unchanged'; mapping: UnitMapping }
  | { kind: 'create' }
  | { kind: 'conflict-external'; existing: UnitMapping }
  | { kind: 'conflict-local'; existing: UnitMapping };

export function decideMappingSave(
  existing: readonly UnitMapping[],
  input: MappingSaveInput,
): MappingSaveDecision {
  // 1. Exact same mapping — idempotent
  const exact = existing.find(
    (m) =>
      m.localUnitId === input.localUnitId &&
      m.externalPropertyId === input.externalPropertyId &&
      m.externalUnitId === input.externalUnitId &&
      m.confirmed,
  );
  if (exact) return { kind: 'unchanged', mapping: exact };

  // 2. External unit already mapped to a DIFFERENT local unit
  const externalConflict = existing.find(
    (m) =>
      m.externalPropertyId === input.externalPropertyId &&
      m.externalUnitId === input.externalUnitId &&
      m.localUnitId !== input.localUnitId,
  );
  if (externalConflict) {
    return { kind: 'conflict-external', existing: externalConflict };
  }

  // 3. Local unit already mapped to a DIFFERENT external unit — no silent remap
  const localConflict = existing.find(
    (m) =>
      m.localUnitId === input.localUnitId &&
      (m.externalPropertyId !== input.externalPropertyId ||
        m.externalUnitId !== input.externalUnitId),
  );
  if (localConflict) {
    return { kind: 'conflict-local', existing: localConflict };
  }

  return { kind: 'create' };
}