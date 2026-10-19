import { clamp01 } from '@/design-system/status';

/**
 * Adds an alpha channel to a 6-digit hex colour and returns an #RRGGBBAA
 * string (`withAlpha('#22D3EE', 0.12)` → `'#22D3EE1F'`). Only use with token
 * hex colours — rgba() strings are returned unchanged.
 */
export function withAlpha(hex: string, alpha: number): string {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return hex;
  const byte = Math.round(clamp01(alpha) * 255)
    .toString(16)
    .padStart(2, '0')
    .toUpperCase();
  return `${hex}${byte}`;
}
