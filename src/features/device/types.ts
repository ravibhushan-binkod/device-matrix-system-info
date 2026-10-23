import type { BrandMark } from '@/core/brand/detect-brand';

export type DeviceInfoEntry = {
  key: string;
  label: string;
  /** `null` renders as "Not available on this device". */
  value: string | null;
  /** Long values wrap instead of truncating (fingerprint, kernel). */
  multiline?: boolean;
  /** Masked in the UI while Settings → Privacy → Hide sensitive values is on. */
  sensitive?: boolean;
};

export type DeviceInfoSection = {
  key: string;
  title: string;
  entries: DeviceInfoEntry[];
};

/** The marks the Device/OS header draws: the phone maker and the OS. */
export type DeviceBranding = {
  phone: BrandMark | null;
  platform: BrandMark | null;
};

export type DeviceInfo = {
  sections: DeviceInfoSection[];
  /** The "Copy all" plain-text report. */
  report: string;
  branding: DeviceBranding;
};
