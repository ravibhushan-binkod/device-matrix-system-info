import type { BuildInfo } from '@/core/native';
import type { DeviceFacts } from '@/features/dashboard/types';

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/**
 * Android release years for the first API level a device shipped with.
 * `Build.VERSION.FIRST_SDK_INT` is a launch fact, so the age is an estimate of
 * the model generation, not the age of this handset.
 */
export const ANDROID_RELEASE_YEARS: Readonly<Record<number, number>> = {
  21: 2014,
  22: 2015,
  23: 2015,
  24: 2016,
  25: 2016,
  26: 2017,
  27: 2017,
  28: 2018,
  29: 2019,
  30: 2020,
  31: 2021,
  32: 2022,
  33: 2022,
  34: 2023,
  35: 2024,
  36: 2025,
  37: 2026,
};

/** `Build.TIME` → "20 Oct 2026"; `null` for a missing timestamp. */
export function formatBuildDate(buildTimeMillis: number | null): string | null {
  if (buildTimeMillis == null || !Number.isFinite(buildTimeMillis) || buildTimeMillis <= 0) {
    return null;
  }
  const date = new Date(buildTimeMillis);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** "API 30" for the first API level; `null` when Android hides it. */
export function formatFirstApiLevel(firstApiLevel: number | null): string | null {
  if (firstApiLevel == null || !Number.isInteger(firstApiLevel) || firstApiLevel <= 0) return null;
  return `API ${firstApiLevel}`;
}

/**
 * Whole years between the Android release the phone launched with and now.
 * Returns `null` for an unknown API level, never a guess.
 */
export function estimateDeviceAgeYears(
  firstApiLevel: number | null,
  now = Date.now(),
): number | null {
  if (firstApiLevel == null) return null;
  const releaseYear = ANDROID_RELEASE_YEARS[firstApiLevel];
  if (releaseYear == null) return null;
  const currentYear = new Date(now).getFullYear();
  return Math.max(0, currentYear - releaseYear);
}

export function formatDeviceAge(years: number | null): string | null {
  if (years == null || !Number.isFinite(years) || years < 0) return null;
  if (years < 1) return 'Under 1 year';
  if (years === 1) return '~1 year';
  return `~${Math.round(years)} years`;
}

type BuildFactsInput = Pick<BuildInfo, 'buildTimeMillis' | 'securityPatch' | 'firstApiLevel'>;

/** Derives the dashboard facts row from Android's Build values. */
export function buildDeviceFacts(build: BuildFactsInput, now = Date.now()): DeviceFacts {
  const firstApiLevel =
    build.firstApiLevel != null && build.firstApiLevel > 0 ? build.firstApiLevel : null;
  const estimatedAgeYears = estimateDeviceAgeYears(firstApiLevel, now);
  return {
    buildDateMillis: build.buildTimeMillis,
    buildDateLabel: formatBuildDate(build.buildTimeMillis),
    securityPatch: build.securityPatch,
    firstApiLevel,
    estimatedAgeYears,
    estimatedAgeLabel: formatDeviceAge(estimatedAgeYears),
  };
}
