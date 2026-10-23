import { useMemo } from 'react';

import { buildFormatters, type Formatters } from './formatters';
import { useUnitsStore } from './store';

/**
 * The reactive formatter bundle. Components that must update immediately when
 * a unit preference changes call this; services and stores can lean on the
 * `@/core/utils` shims, which follow the same active units.
 */
export function useFormatters(): Formatters {
  const units = useUnitsStore((state) => state.units);
  return useMemo(() => buildFormatters(units), [units]);
}
