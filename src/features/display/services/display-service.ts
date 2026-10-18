import { getDisplayInfo } from '@/core/native';
import type { DisplayInfo, DisplayMode } from '@/core/native';
import type { Result } from '@/core/result';
import type { DisplayModeRows } from '@/features/display/types';

export function readDisplay(): Result<DisplayInfo> {
  return getDisplayInfo();
}

export function formatResolution(widthPx: number | null, heightPx: number | null): string | null {
  if (widthPx == null || heightPx == null || widthPx <= 0 || heightPx <= 0) return null;
  return `${widthPx} × ${heightPx} px`;
}

/**
 * Panel diagonal in inches from the physical pixel size and the panel dpi
 * (`DisplayMetrics.xdpi/ydpi` are physical pixels per inch). `null` when the
 * dpi is missing or nonsensical.
 */
export function diagonalInches(
  widthPx: number | null,
  heightPx: number | null,
  xdpi: number,
  ydpi: number,
): number | null {
  if (widthPx == null || heightPx == null || widthPx <= 0 || heightPx <= 0) return null;
  if (!(xdpi > 0) || !(ydpi > 0)) return null;
  const widthInches = widthPx / xdpi;
  const heightInches = heightPx / ydpi;
  const diagonal = Math.sqrt(widthInches * widthInches + heightInches * heightInches);
  return Number.isFinite(diagonal) && diagonal > 0 ? diagonal : null;
}

export function formatInches(inches: number | null): string | null {
  if (inches == null || !Number.isFinite(inches) || inches <= 0) return null;
  return `${inches.toFixed(1)} in`;
}

export function formatRefreshRate(hz: number | null): string | null {
  if (hz == null || !Number.isFinite(hz) || hz <= 0) return null;
  return `${Math.round(hz)} Hz`;
}

/** De-duplicates the supported-mode list (same size and same rounded rate). */
export function uniqueDisplayModes(modes: DisplayMode[]): DisplayMode[] {
  const seen = new Set<string>();
  const unique: DisplayMode[] = [];
  for (const mode of modes) {
    const key = `${mode.widthPx}x${mode.heightPx}@${Math.round(mode.refreshRateHz)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(mode);
  }
  return unique;
}

export function modeLabel(mode: DisplayMode): string {
  return `${mode.widthPx} × ${mode.heightPx} · ${Math.round(mode.refreshRateHz)} Hz`;
}

/** Supported modes capped for display, plus how many were left out. */
export function buildModeRows(info: DisplayInfo, maxRows = 6): DisplayModeRows {
  const unique = uniqueDisplayModes(info.supportedModes);
  const rows = unique.slice(0, maxRows).map((mode, index) => ({
    key: `${mode.widthPx}x${mode.heightPx}@${Math.round(mode.refreshRateHz)}-${index}`,
    label: modeLabel(mode),
  }));
  return { rows, hiddenCount: Math.max(0, unique.length - rows.length) };
}

/** Settings.System brightness (0–255) as a percentage. */
export function brightnessPercent(brightness: number | null): number | null {
  if (brightness == null || !Number.isFinite(brightness)) return null;
  return Math.round((Math.min(255, Math.max(0, brightness)) / 255) * 100);
}

export function brightnessModeLabel(mode: 'auto' | 'manual' | null): string | null {
  if (mode === 'auto') return 'Auto';
  if (mode === 'manual') return 'Manual';
  return null;
}

/** HDR capability: the supported type list when reported, otherwise Yes/No. */
export function hdrLabel(isHdr: boolean | null, hdrTypes: string[]): string | null {
  if (isHdr == null) return null;
  if (hdrTypes.length > 0) return hdrTypes.join(' · ');
  return isHdr ? 'Supported' : 'No';
}
