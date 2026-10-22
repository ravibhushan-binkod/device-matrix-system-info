import { getActiveUnits } from '@/core/units/active';
import { formatFrequencyKhz as formatFrequencyKhzIn } from '@/core/units/format';

/**
 * kHz → human frequency string in the active unit: "2.20 GHz", "300 MHz" or
 * "500 kHz" when the user chose the automatic scale.
 */
export function formatFrequencyKhz(khz: number, digits = 2): string {
  return formatFrequencyKhzIn(khz, getActiveUnits().frequency, digits);
}
