/** kHz → human frequency string, e.g. `2_200_000` → "2.20 GHz", `300_000` → "300 MHz". */
export function formatFrequencyKhz(khz: number, digits = 2): string {
  if (!Number.isFinite(khz) || khz <= 0) return '—';
  if (khz >= 1_000_000) return `${(khz / 1_000_000).toFixed(digits)} GHz`;
  if (khz >= 1_000) return `${Math.round(khz / 1_000)} MHz`;
  return `${Math.round(khz)} kHz`;
}
