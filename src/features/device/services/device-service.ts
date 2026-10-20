import { getBuildInfo, getOsInfo, getUptime } from '@/core/native';
import { formatUptime } from '@/core/utils/format-duration';
import { buildReportText } from '@/core/utils/report-text';
import type { DeviceInfo, DeviceInfoSection } from '@/features/device/types';

export type DeviceInfoInput = {
  brand: string | null;
  model: string | null;
  androidVersion: string | null;
  releaseName: string | null;
  apiLevel: number | null;
  securityPatch: string | null;
  buildId: string | null;
  buildTimeMillis: number | null;
  firstApiLevel: number | null;
  /** Pre-formatted "≈ 2 yr 2 mo · from build date" reading. */
  estimatedAge: string | null;
  playServices: string | null;
  selinuxMode: 'enforcing' | 'permissive' | null;
  uptime: string | null;
  locale: string | null;
  timeZone: string | null;
  developerOptions: boolean | null;
  kernel: string | null;
  bootloader: string | null;
  hardware: string | null;
  board: string | null;
  product: string | null;
  codename: string | null;
  fingerprint: string | null;
};

function capitalize(text: string): string {
  return text.length === 0 ? text : text.charAt(0).toUpperCase() + text.slice(1);
}

/** Locale and time zone come from the JS engine (Intl), not from a native call. */
export function getLocaleInfo(): { locale: string | null; timeZone: string | null } {
  try {
    const resolved = Intl.DateTimeFormat().resolvedOptions();
    return {
      locale: resolved.locale != null && resolved.locale.length > 0 ? resolved.locale : null,
      timeZone:
        resolved.timeZone != null && resolved.timeZone.length > 0 ? resolved.timeZone : null,
    };
  } catch {
    return { locale: null, timeZone: null };
  }
}

/** Public dessert names, which Google only used through Android 9 (API 28). */
const RELEASE_NAMES: Record<number, string> = {
  21: 'Lollipop',
  22: 'Lollipop',
  23: 'Marshmallow',
  24: 'Nougat',
  25: 'Nougat',
  26: 'Oreo',
  27: 'Oreo',
  28: 'Pie',
};

/** Marketing release name of an API level; `null` on Android 10+ (numbers only). */
export function androidReleaseName(apiLevel: number | null): string | null {
  if (apiLevel == null) return null;
  return RELEASE_NAMES[apiLevel] ?? null;
}

/** First public release of each API level — the floor for the age estimate. */
const FIRST_RELEASE_DATES: Record<number, [number, number, number]> = {
  21: [2014, 11, 3],
  22: [2015, 3, 9],
  23: [2015, 10, 5],
  24: [2016, 8, 22],
  25: [2016, 10, 4],
  26: [2017, 8, 21],
  27: [2017, 12, 5],
  28: [2018, 8, 6],
  29: [2019, 9, 3],
  30: [2020, 9, 8],
  31: [2021, 10, 4],
  32: [2022, 3, 7],
  33: [2022, 8, 15],
  34: [2023, 10, 4],
  35: [2024, 9, 3],
  36: [2025, 6, 10],
};

export function firstApiReleaseMillis(apiLevel: number | null): number | null {
  if (apiLevel == null) return null;
  const date = FIRST_RELEASE_DATES[apiLevel];
  if (date == null) return null;
  const millis = Date.UTC(date[0], date[1] - 1, date[2]);
  return Number.isFinite(millis) ? millis : null;
}

/** Average month (365.25 / 12 days) — the estimate is coarse on purpose. */
const AVERAGE_MONTH_MS = 2_629_800_000;

export type AgeSource = 'build-date' | 'release-date';

/**
 * Device age lower bound: the older of the ROM build time and the first
 * public release of the API level the device launched with. Coarse by
 * design — show it as an estimate, never as a fact.
 */
export function estimateAge(
  buildTimeMillis: number | null,
  firstApiLevel: number | null,
  nowMs = Date.now(),
): { months: number; source: AgeSource } | null {
  const candidates: { millis: number; source: AgeSource }[] = [];
  if (buildTimeMillis != null && buildTimeMillis > 0) {
    candidates.push({ millis: buildTimeMillis, source: 'build-date' });
  }
  const release = firstApiReleaseMillis(firstApiLevel);
  if (release != null) candidates.push({ millis: release, source: 'release-date' });
  if (candidates.length === 0) return null;

  const oldest = candidates.reduce((a, b) => (b.millis < a.millis ? b : a));
  const months = Math.floor((nowMs - oldest.millis) / AVERAGE_MONTH_MS);
  return months >= 0 ? { months, source: oldest.source } : null;
}

/** "≈ 2 yr 2 mo · from build date" — the "Estimated age" row. */
export function formatAge(estimate: { months: number; source: AgeSource } | null): string | null {
  if (estimate == null) return null;
  const { months, source } = estimate;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const duration =
    months < 12 ? `${months} mo` : rest === 0 ? `${years} yr` : `${years} yr ${rest} mo`;
  const basis = source === 'build-date' ? 'build date' : 'first Android release';
  return `≈ ${duration} · from ${basis}`;
}

/** `Build.TIME` as a plain UTC date, e.g. "2025-06-05". */
export function formatBuildDate(millis: number | null): string | null {
  if (millis == null || !(millis > 0)) return null;
  const date = new Date(millis);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

/** Kernel security mode as a display label, `null` when unavailable. */
export function selinuxLabel(mode: 'enforcing' | 'permissive' | null): string | null {
  if (mode == null) return null;
  return mode === 'enforcing' ? 'Enforcing' : 'Permissive';
}

/** Pure section builder — every missing reading stays `null` and is never guessed. */
export function buildDeviceSections(input: DeviceInfoInput): DeviceInfoSection[] {
  return [
    {
      key: 'device',
      title: 'Device',
      entries: [
        {
          key: 'brand',
          label: 'Brand',
          value: input.brand == null ? null : capitalize(input.brand),
        },
        { key: 'model', label: 'Model', value: input.model },
      ],
    },
    {
      key: 'android',
      title: 'Android',
      entries: [
        { key: 'android', label: 'Android version', value: input.androidVersion },
        { key: 'release', label: 'Release name', value: input.releaseName },
        {
          key: 'api-level',
          label: 'API level',
          value: input.apiLevel == null ? null : String(input.apiLevel),
        },
        { key: 'security-patch', label: 'Security patch', value: input.securityPatch },
        { key: 'build-id', label: 'Build ID', value: input.buildId },
        { key: 'build-date', label: 'Build date', value: formatBuildDate(input.buildTimeMillis) },
        {
          key: 'first-api',
          label: 'First API level',
          value: input.firstApiLevel == null ? null : String(input.firstApiLevel),
        },
        { key: 'age', label: 'Estimated age', value: input.estimatedAge, multiline: true },
      ],
    },
    {
      key: 'system',
      title: 'System',
      entries: [
        { key: 'play-services', label: 'Play services', value: input.playServices },
        { key: 'selinux', label: 'SELinux', value: selinuxLabel(input.selinuxMode) },
        { key: 'uptime', label: 'Uptime', value: input.uptime },
        { key: 'locale', label: 'Locale', value: input.locale },
        { key: 'time-zone', label: 'Time zone', value: input.timeZone },
        {
          key: 'developer-options',
          label: 'Developer options',
          value: input.developerOptions == null ? null : input.developerOptions ? 'On' : 'Off',
        },
      ],
    },
    {
      key: 'kernel',
      title: 'Kernel & boot',
      entries: [
        { key: 'kernel', label: 'Kernel', value: input.kernel, multiline: true },
        { key: 'bootloader', label: 'Bootloader', value: input.bootloader },
        { key: 'hardware', label: 'Hardware', value: input.hardware },
        { key: 'board', label: 'Board', value: input.board },
        { key: 'product', label: 'Product', value: input.product },
        { key: 'codename', label: 'Codename', value: input.codename },
        { key: 'fingerprint', label: 'Fingerprint', value: input.fingerprint, multiline: true },
      ],
    },
  ];
}

/** Device & OS screen data: the sections plus the "Copy all" report text. */
export function readDeviceInfo(): DeviceInfo {
  const build = getBuildInfo();
  const os = getOsInfo();
  const uptime = getUptime();
  const localeInfo = getLocaleInfo();

  const apiLevel = build.status === 'ok' ? build.value.apiLevel : null;
  const buildTimeMillis = build.status === 'ok' ? build.value.buildTimeMillis : null;
  const firstApiLevel = build.status === 'ok' ? build.value.firstApiLevel : null;

  const input: DeviceInfoInput = {
    brand: build.status === 'ok' ? build.value.brand : null,
    model: build.status === 'ok' ? build.value.model : null,
    androidVersion: build.status === 'ok' ? build.value.androidVersion : null,
    releaseName: androidReleaseName(apiLevel),
    apiLevel,
    securityPatch: build.status === 'ok' ? build.value.securityPatch : null,
    buildId: build.status === 'ok' ? build.value.buildId : null,
    buildTimeMillis,
    firstApiLevel,
    estimatedAge: formatAge(estimateAge(buildTimeMillis, firstApiLevel)),
    playServices: os.status === 'ok' ? os.value.playServicesVersion : null,
    selinuxMode: os.status === 'ok' ? os.value.selinuxMode : null,
    uptime: uptime.status === 'ok' ? formatUptime(uptime.value.uptimeMillis) : null,
    locale: localeInfo.locale,
    timeZone: localeInfo.timeZone,
    developerOptions: os.status === 'ok' ? os.value.developerOptions : null,
    kernel: os.status === 'ok' ? os.value.kernel : null,
    bootloader: build.status === 'ok' ? build.value.bootloader : null,
    hardware: build.status === 'ok' ? build.value.hardware : null,
    board: build.status === 'ok' ? build.value.board : null,
    product: build.status === 'ok' ? build.value.product : null,
    codename: build.status === 'ok' ? build.value.device : null,
    fingerprint: build.status === 'ok' ? build.value.fingerprint : null,
  };

  const sections = buildDeviceSections(input);
  return { sections, report: buildReportText(sections, 'Device Matrix: System info') };
}
