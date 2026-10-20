export type NativeConnectivityInfo = {
  /** 'wifi' | 'cellular' | 'ethernet' | 'vpn' | 'bluetooth' | 'usb' | 'other' | 'none' */
  type: string;
  metered: boolean;
  vpn: boolean;
  dataSaver: boolean | null;
  airplaneMode: boolean | null;
  /** 'off' | 'opportunistic' | 'hostname' | null */
  privateDnsMode: string | null;
  privateDnsHost: string | null;
  operatorName: string | null;
  /** `null` unless the cellular network reported it (API 28+). */
  roaming: boolean | null;
  ipv4: string | null;
  ipv6: string | null;
  /** IPv4 subnet prefix length (e.g. 24), read from the link address. */
  subnetPrefix: number | null;
  gateway: string | null;
  dnsServers: string[];
  proxyHost: string | null;
  proxyPort: number | null;
  proxyPacUrl: string | null;
};

export type NativeWifiInfo = {
  enabled: boolean | null;
  /** Whether the radio can use the 5 GHz band at all; `null` when undefined. */
  fiveGhzSupported: boolean | null;
  connected: boolean;
  ssid: string | null;
  linkSpeedMbps: number | null;
  /** Android 11+; `null` on older builds. */
  txLinkSpeedMbps: number | null;
  rxLinkSpeedMbps: number | null;
  frequencyMhz: number | null;
  rssiDbm: number | null;
  /** `ScanResult.WIFI_STANDARD_*`: 1 legacy, 4 = 802.11n, 5 = ac, 6 = ax, 7 = ad, 8 = be. */
  standardCode: number | null;
  /** `ScanResult.CHANNEL_WIDTH_*` code (0 = 20 MHz … 5 = 320 MHz); null when unknown. */
  channelWidth: number | null;
};

export type NativeBluetoothInfo = {
  present: boolean;
  /** `null` when Android blocks the read (BLUETOOTH_CONNECT not granted). */
  enabled: boolean | null;
  leSupported: boolean;
};

export type NativeNfcInfo = {
  present: boolean;
  enabled: boolean | null;
};

export type NativeWifiScanStart = {
  started: boolean;
  /** `true` when Android refused to start the scan (throttle or radio off). */
  throttled: boolean;
  /** Whether the OS throttles scans at all (Android 11+). */
  scanThrottleEnabled: boolean | null;
};

export type NativeWifiNetwork = {
  /** `null` when the name is hidden or Android redacts it. */
  ssid: string | null;
  /** `null` when the address is hidden or Android redacts it. */
  bssid: string | null;
  rssiDbm: number;
  frequencyMhz: number;
  /** `ScanResult.CHANNEL_WIDTH_*` code. */
  channelWidth: number;
  /** `ScanResult.WIFI_STANDARD_*` code; null below Android 11. */
  standardCode: number | null;
  /** Security codes (Android 14+); null when the OS does not report them. */
  securityTypes: number[] | null;
  /** Raw capability string, e.g. `[WPA2-PSK-CCMP][WPA3-SAE][ESS]`. */
  capabilities: string;
  /** Milliseconds since this result was seen. */
  ageMs: number;
};

export type NativeWifiScanResults = {
  networks: NativeWifiNetwork[];
  scanThrottleEnabled: boolean | null;
  /** Age of the newest result; null when the cache is empty. */
  lastScanAgeMs: number | null;
};

export type NativeWifiCapabilities = {
  fiveGhzSupported: boolean | null;
  sixGhzSupported: boolean | null;
  standard6Supported: boolean | null;
  standard7Supported: boolean | null;
  scanThrottleEnabled: boolean | null;
};

export type NativeBluetoothCapabilities = {
  leAudioSupported: boolean | null;
  le2mPhySupported: boolean | null;
  leCodedPhySupported: boolean | null;
  leExtendedAdvertisingSupported: boolean | null;
  lePeriodicAdvertisingSupported: boolean | null;
  multipleAdvertisementSupported: boolean | null;
  offloadedScanBatchingSupported: boolean | null;
};

export type NativeConnectivityCapabilities = {
  systemFeatures: string[];
  wifi: NativeWifiCapabilities;
  bluetooth: NativeBluetoothCapabilities;
};

export type NativeUsageBucket = {
  startMs: number;
  endMs: number;
  rxBytes: number;
  txBytes: number;
};

export type NativeUsageSeries = {
  buckets: NativeUsageBucket[];
  rxBytes: number;
  txBytes: number;
};

export type NativeDataUsage = {
  usageAccess: boolean;
  wifi: NativeUsageSeries | null;
  mobile: NativeUsageSeries | null;
  /** Android withheld the mobile figures (no phone-state permission). */
  mobileBlocked: boolean;
};

export type NativeAppUsage = {
  uid: number;
  packageName: string | null;
  label: string | null;
  wifiRxBytes: number;
  wifiTxBytes: number;
  mobileRxBytes: number;
  mobileTxBytes: number;
};

export type NativeDataUsageTopApps = {
  usageAccess: boolean;
  apps: NativeAppUsage[];
  mobileBlocked: boolean;
};
