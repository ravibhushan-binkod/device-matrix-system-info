import { resolveUnits } from './resolve';
import { DEFAULT_UNIT_PREFERENCES, type ResolvedUnits } from './types';

/**
 * The units the plain (non-hook) formatter shims in `@/core/utils` use.
 * The units store keeps this in sync; `useFormatters()` is the reactive path
 * for components that must update the moment a preference changes.
 */
let activeUnits: ResolvedUnits = resolveUnits(DEFAULT_UNIT_PREFERENCES);

export function getActiveUnits(): ResolvedUnits {
  return activeUnits;
}

export function setActiveUnits(units: ResolvedUnits): void {
  activeUnits = units;
}
