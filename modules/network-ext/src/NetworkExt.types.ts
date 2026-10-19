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
  ipv4: string | null;
  ipv6: string | null;
  gateway: string | null;
  dnsServers: string[];
};

export type NativeWifiInfo = {
  enabled: boolean | null;
  /** Whether the radio can use the 5 GHz band at all; `null` when undefined. */
  fiveGhzSupported: boolean | null;
  connected: boolean;
  ssid: string | null;
  linkSpeedMbps: number | null;
  frequencyMhz: number | null;
  rssiDbm: number | null;
  /** `ScanResult.WIFI_STANDARD_*`: 1 legacy, 4 = 802.11n, 5 = ac, 6 = ax, 7 = ad, 8 = be. */
  standardCode: number | null;
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
