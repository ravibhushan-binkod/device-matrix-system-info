import { requireOptionalNativeModule } from 'expo';
import { create } from 'zustand';

import { getString, setString } from '@/core/storage/mmkv';

import { setActiveUnits } from './active';
import { parseUnitPreferences } from './catalog';
import { resolveUnits } from './resolve';
import { DEFAULT_UNIT_PREFERENCES, type ResolvedUnits, type UnitPreferences } from './types';

const UNITS_KEY = 'settings.units';

/** The Home widget reads these same SharedPreferences keys (native side). */
export const WIDGET_UNITS_PREFS_NAME = 'device_matrix_widget';

type WidgetUnitModule = {
  setUnitPreferences: (temperature: string, storage: string) => void;
};

function readPreferences(): UnitPreferences {
  const raw = getString(UNITS_KEY);
  if (raw == null) return { ...DEFAULT_UNIT_PREFERENCES };
  try {
    return parseUnitPreferences(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_UNIT_PREFERENCES };
  }
}

/**
 * Mirrors the two choices the widget will need later (temperature and
 * storage) into Android SharedPreferences. The widget is not required: if the
 * module is missing (web, a stripped build) this is a no-op.
 */
export function mirrorUnitsToWidget(units: ResolvedUnits): void {
  try {
    const module = requireOptionalNativeModule<WidgetUnitModule>('HomeWidget');
    module?.setUnitPreferences(units.temperature === 'F' ? 'fahrenheit' : 'celsius', units.storage);
  } catch {
    // The widget module is optional; readings never depend on it.
  }
}

type UnitsState = {
  preferences: UnitPreferences;
  /** Concrete units after resolving every `system` choice. */
  units: ResolvedUnits;
  setPreference: (category: keyof UnitPreferences, value: string) => void;
  resetUnits: () => void;
};

function initialState(): Pick<UnitsState, 'preferences' | 'units'> {
  const preferences = readPreferences();
  const units = resolveUnits(preferences);
  setActiveUnits(units);
  return { preferences, units };
}

/** Unit preferences: Zustand for the UI, MMKV for storage, SharedPreferences for the widget. */
export const useUnitsStore = create<UnitsState>((set, get) => ({
  ...initialState(),
  setPreference: (category, value) => {
    const preferences: UnitPreferences = { ...get().preferences };
    (preferences as unknown as Record<string, string>)[category] = value;
    const units = resolveUnits(preferences);
    setString(UNITS_KEY, JSON.stringify(preferences));
    setActiveUnits(units);
    mirrorUnitsToWidget(units);
    set({ preferences, units });
  },
  resetUnits: () => {
    const preferences: UnitPreferences = { ...DEFAULT_UNIT_PREFERENCES };
    const units = resolveUnits(preferences);
    setString(UNITS_KEY, JSON.stringify(preferences));
    setActiveUnits(units);
    mirrorUnitsToWidget(units);
    set({ preferences, units });
  },
}));
