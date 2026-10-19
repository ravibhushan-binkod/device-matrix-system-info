export type TemperatureUnit = 'C' | 'F';

export function celsiusToFahrenheit(celsius: number): number {
  return (celsius * 9) / 5 + 32;
}

/** Formats a Celsius reading in °C or °F, e.g. `38.5` → "38 °C" / "101 °F". */
export function formatTemperature(
  celsius: number,
  unit: TemperatureUnit = 'C',
  digits = 0,
): string {
  if (!Number.isFinite(celsius)) return '—';
  const value = unit === 'F' ? celsiusToFahrenheit(celsius) : celsius;
  return `${value.toFixed(digits)} °${unit}`;
}
