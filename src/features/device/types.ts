export type DeviceInfoEntry = {
  key: string;
  label: string;
  /** `null` renders as "Not available on this device". */
  value: string | null;
  /** Long values wrap instead of truncating (fingerprint, kernel). */
  multiline?: boolean;
};

export type DeviceInfoSection = {
  key: string;
  title: string;
  entries: DeviceInfoEntry[];
};

export type DeviceInfo = {
  sections: DeviceInfoSection[];
  /** The "Copy all" plain-text report. */
  report: string;
};
