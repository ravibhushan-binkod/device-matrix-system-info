/**
 * Unit and format preferences.
 *
 * Every category starts at `system`: the app resolves it from the phone's
 * locale/region (via `resolveUnits`) and shows the resolved value in Settings.
 * The stored choice is always explicit per category — nothing is inferred twice.
 */

export type TemperaturePreference = 'system' | 'celsius' | 'fahrenheit';
export type StoragePreference = 'system' | 'decimal' | 'binary';
export type FrequencyPreference = 'system' | 'auto' | 'ghz' | 'mhz';
export type NetworkSpeedPreference = 'system' | 'megabits' | 'megabytes';
export type ScreenSizePreference = 'system' | 'inches' | 'centimetres';
export type DistancePreference = 'system' | 'metres' | 'feet';
export type AccelerationPreference = 'system' | 'metres' | 'gforce';
export type PressurePreference = 'system' | 'hectopascals' | 'kilopascals' | 'mmhg' | 'inhg';
export type TimeFormatPreference = 'system' | '12h' | '24h';
export type PowerPreference = 'system' | 'watts' | 'milliwatts';

export type UnitPreferences = {
  temperature: TemperaturePreference;
  storage: StoragePreference;
  frequency: FrequencyPreference;
  networkSpeed: NetworkSpeedPreference;
  screenSize: ScreenSizePreference;
  distance: DistancePreference;
  acceleration: AccelerationPreference;
  pressure: PressurePreference;
  timeFormat: TimeFormatPreference;
  power: PowerPreference;
};

export type UnitCategory = keyof UnitPreferences;

/**
 * The concrete choices after `system` has been resolved. These are the only
 * values the formatters ever use, so a screen can show exactly what it shows.
 */
export type ResolvedUnits = {
  /** `C` = Celsius, `F` = Fahrenheit. */
  temperature: 'C' | 'F';
  storage: 'decimal' | 'binary';
  /** `auto` scales per value (GHz → MHz → kHz); `GHz`/`MHz` force one unit. */
  frequency: 'auto' | 'GHz' | 'MHz';
  networkSpeed: 'Mbps' | 'MB/s';
  screenSize: 'in' | 'cm';
  distance: 'm' | 'ft';
  acceleration: 'm/s²' | 'g';
  pressure: 'hPa' | 'kPa' | 'mmHg' | 'inHg';
  timeFormat: '12h' | '24h';
  power: 'W' | 'mW';
};

export const DEFAULT_UNIT_PREFERENCES: UnitPreferences = {
  temperature: 'system',
  storage: 'system',
  frequency: 'system',
  networkSpeed: 'system',
  screenSize: 'system',
  distance: 'system',
  acceleration: 'system',
  pressure: 'system',
  timeFormat: 'system',
  power: 'system',
};
