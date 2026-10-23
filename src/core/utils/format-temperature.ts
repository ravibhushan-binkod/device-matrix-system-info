import { getActiveUnits } from '@/core/units/active';
import { formatTemperature as formatTemperatureIn } from '@/core/units/format';

export type TemperatureUnit = 'C' | 'F';

export { celsiusToFahrenheit } from '@/core/units/format';

/** Formats a Celsius reading in the active (or given) unit, e.g. "38 °C" / "101 °F". */
export function formatTemperature(
  celsius: number,
  unit: TemperatureUnit = getActiveUnits().temperature,
  digits = 0,
): string {
  return formatTemperatureIn(celsius, unit, digits);
}
