import { DEFAULT_UNIT_PREFERENCES, type UnitCategory, type UnitPreferences } from './types';

export type UnitOption = {
  value: string;
  label: string;
};

export type UnitSettingDefinition = {
  key: UnitCategory;
  title: string;
  description: string;
  options: readonly UnitOption[];
};

const SYSTEM_OPTION: UnitOption = { value: 'system', label: 'System default' };

/**
 * Every unit row the Settings screen shows, in display order. The first
 * option is always "System default"; the resolved value is appended in grey.
 */
export const UNIT_SETTINGS: readonly UnitSettingDefinition[] = [
  {
    key: 'temperature',
    title: 'Temperature',
    description: 'Battery and thermal readings.',
    options: [
      SYSTEM_OPTION,
      { value: 'celsius', label: 'Celsius (°C)' },
      { value: 'fahrenheit', label: 'Fahrenheit (°F)' },
    ],
  },
  {
    key: 'storage',
    title: 'Storage & memory',
    description: 'RAM, storage, apps and data usage sizes.',
    options: [
      SYSTEM_OPTION,
      { value: 'decimal', label: 'GB (decimal, 1000)' },
      { value: 'binary', label: 'GiB (binary, 1024)' },
    ],
  },
  {
    key: 'frequency',
    title: 'Frequency',
    description: 'CPU, GPU and memory clock speeds.',
    options: [SYSTEM_OPTION, { value: 'ghz', label: 'GHz' }, { value: 'mhz', label: 'MHz' }],
  },
  {
    key: 'networkSpeed',
    title: 'Network speed',
    description: 'Link, Wi-Fi and mobile connection speeds.',
    options: [
      SYSTEM_OPTION,
      { value: 'megabits', label: 'Mbps (megabits per second)' },
      { value: 'megabytes', label: 'MB/s (megabytes per second)' },
    ],
  },
  {
    key: 'screenSize',
    title: 'Screen size',
    description: 'Panel diagonal measurements.',
    options: [
      SYSTEM_OPTION,
      { value: 'inches', label: 'Inches (in)' },
      { value: 'centimetres', label: 'Centimetres (cm)' },
    ],
  },
  {
    key: 'distance',
    title: 'Distance',
    description: 'Estimated Wi-Fi and sensor distances.',
    options: [
      SYSTEM_OPTION,
      { value: 'metres', label: 'Metres (m)' },
      { value: 'feet', label: 'Feet (ft)' },
    ],
  },
  {
    key: 'acceleration',
    title: 'Acceleration',
    description: 'Motion sensor readings.',
    options: [
      SYSTEM_OPTION,
      { value: 'metres', label: 'Metres per second squared (m/s²)' },
      { value: 'gforce', label: 'Standard gravity (g)' },
    ],
  },
  {
    key: 'pressure',
    title: 'Pressure',
    description: 'Barometer and atmospheric pressure readings.',
    options: [
      SYSTEM_OPTION,
      { value: 'hectopascals', label: 'Hectopascals (hPa)' },
      { value: 'kilopascals', label: 'Kilopascals (kPa)' },
      { value: 'mmhg', label: 'Millimetres of mercury (mmHg)' },
      { value: 'inhg', label: 'Inches of mercury (inHg)' },
    ],
  },
  {
    key: 'timeFormat',
    title: 'Time format',
    description: 'Clocks, alarms and report timestamps.',
    options: [
      SYSTEM_OPTION,
      { value: '12h', label: '12-hour' },
      { value: '24h', label: '24-hour' },
    ],
  },
  {
    key: 'power',
    title: 'Power',
    description: 'Battery and hardware power readings.',
    options: [
      SYSTEM_OPTION,
      { value: 'watts', label: 'Watts (W)' },
      { value: 'milliwatts', label: 'Milliwatts (mW)' },
    ],
  },
];

const SETTING_BY_KEY = new Map(UNIT_SETTINGS.map((setting) => [setting.key, setting]));

export function unitSetting(key: UnitCategory): UnitSettingDefinition {
  return SETTING_BY_KEY.get(key) as UnitSettingDefinition;
}

/** True when `value` is one of the stored choices for the category. */
export function isUnitOptionValue(key: UnitCategory, value: unknown): value is string {
  const setting = SETTING_BY_KEY.get(key);
  return setting != null && setting.options.some((option) => option.value === value);
}

/**
 * Reads stored preferences without trusting them. Unknown values and unknown
 * keys fall back to `system`, so a renamed option can never break Settings.
 */
export function parseUnitPreferences(raw: unknown): UnitPreferences {
  const result: Record<string, string> = { ...DEFAULT_UNIT_PREFERENCES };
  if (raw == null || typeof raw !== 'object') return result as unknown as UnitPreferences;
  const record = raw as Record<string, unknown>;
  for (const setting of UNIT_SETTINGS) {
    const candidate = record[setting.key];
    if (typeof candidate === 'string' && isUnitOptionValue(setting.key, candidate)) {
      result[setting.key] = candidate;
    }
  }
  return result as unknown as UnitPreferences;
}
