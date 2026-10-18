import type { AppColors } from '@/design-system/tokens';

export type StatusTone = 'good' | 'warning' | 'critical';

export function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/**
 * Single source for the good → warning → critical thresholds (ratios 0..1).
 * Defaults suit "higher = worse" metrics (CPU, memory, thermal).
 */
export function statusTone(ratio: number, warningAt = 0.7, criticalAt = 0.88): StatusTone {
  const value = clamp01(ratio);
  if (value >= criticalAt) return 'critical';
  if (value >= warningAt) return 'warning';
  return 'good';
}

export function statusColor(
  ratio: number,
  colors: AppColors,
  warningAt?: number,
  criticalAt?: number,
): string {
  const tone = statusTone(ratio, warningAt, criticalAt);
  if (tone === 'critical') return colors.critical;
  if (tone === 'warning') return colors.warning;
  return colors.good;
}
