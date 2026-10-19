import { getDeviceBuildInfo, getDeviceIdentity, getOsInfo, getUptime } from '@/core/native';
import { formatUptime } from '@/core/utils/format-duration';
import { buildReportText } from '@/core/utils/report-text';
import type { DeviceInfo, DeviceInfoSection } from '@/features/device/types';

export type DeviceInfoInput = {
  brand: string | null;
  model: string | null;
  androidVersion: string | null;
  apiLevel: number | null;
  securityPatch: string | null;
  buildId: string | null;
  uptime: string | null;
  locale: string | null;
  timeZone: string | null;
  developerOptions: boolean | null;
  kernel: string | null;
  bootloader: string | null;
  hardware: string | null;
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
      key: 'os',
      title: 'OS',
      entries: [
        { key: 'android', label: 'Android version', value: input.androidVersion },
        {
          key: 'api-level',
          label: 'API level',
          value: input.apiLevel == null ? null : String(input.apiLevel),
        },
        { key: 'security-patch', label: 'Security patch', value: input.securityPatch },
        { key: 'build-id', label: 'Build ID', value: input.buildId },
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
        { key: 'fingerprint', label: 'Fingerprint', value: input.fingerprint, multiline: true },
      ],
    },
  ];
}

/** Device & OS screen data: the sections plus the "Copy all" report text. */
export function readDeviceInfo(): DeviceInfo {
  const identity = getDeviceIdentity();
  const build = getDeviceBuildInfo();
  const os = getOsInfo();
  const uptime = getUptime();
  const localeInfo = getLocaleInfo();

  const input: DeviceInfoInput = {
    brand: identity.status === 'ok' ? identity.value.brand : null,
    model: identity.status === 'ok' ? identity.value.model : null,
    androidVersion: identity.status === 'ok' ? identity.value.androidVersion : null,
    apiLevel: identity.status === 'ok' ? identity.value.apiLevel : null,
    securityPatch: build.status === 'ok' ? build.value.securityPatch : null,
    buildId: build.status === 'ok' ? build.value.buildId : null,
    fingerprint: build.status === 'ok' ? build.value.fingerprint : null,
    bootloader: build.status === 'ok' ? build.value.bootloader : null,
    hardware: build.status === 'ok' ? build.value.hardware : null,
    kernel: os.status === 'ok' ? os.value.kernel : null,
    developerOptions: os.status === 'ok' ? os.value.developerOptions : null,
    uptime: uptime.status === 'ok' ? formatUptime(uptime.value.uptimeMillis) : null,
    locale: localeInfo.locale,
    timeZone: localeInfo.timeZone,
  };

  const sections = buildDeviceSections(input);
  return { sections, report: buildReportText(sections, 'Device Matrix: System info') };
}
