import {
  formatAcceleration,
  formatByteSize,
  formatDistance,
  formatFrequencyKhz,
  formatNetworkSpeed,
  formatPower,
  formatPressure,
  formatScreenSize,
  formatTemperature,
} from './format';
import type { ResolvedUnits } from './types';

export type Formatters = {
  /** The resolved units every method below uses. */
  units: ResolvedUnits;
  temperature: (celsius: number, digits?: number) => string;
  bytes: (bytes: number, digits?: number) => string;
  frequencyKhz: (khz: number, digits?: number) => string;
  networkSpeed: (mbps: number, digits?: number) => string;
  screenSize: (inches: number, digits?: number) => string;
  distance: (meters: number, digits?: number) => string;
  acceleration: (metersPerSecondSquared: number, digits?: number) => string;
  pressure: (hectopascals: number, digits?: number) => string;
  power: (watts: number, digits?: number) => string;
};

/** Builds the formatter bundle for one resolved unit set (pure, testable). */
export function buildFormatters(units: ResolvedUnits): Formatters {
  return {
    units,
    temperature: (celsius, digits = 0) => formatTemperature(celsius, units.temperature, digits),
    bytes: (bytes, digits = 1) => formatByteSize(bytes, units.storage, digits),
    frequencyKhz: (khz, digits = 2) => formatFrequencyKhz(khz, units.frequency, digits),
    networkSpeed: (mbps, digits = 1) => formatNetworkSpeed(mbps, units.networkSpeed, digits),
    screenSize: (inches, digits = 1) => formatScreenSize(inches, units.screenSize, digits),
    distance: (meters, digits = 1) => formatDistance(meters, units.distance, digits),
    acceleration: (value, digits = 2) => formatAcceleration(value, units.acceleration, digits),
    pressure: (value, digits) => formatPressure(value, units.pressure, digits),
    power: (watts, digits = 2) => formatPower(watts, units.power, digits),
  };
}
