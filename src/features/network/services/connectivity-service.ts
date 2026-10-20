import type { ConnectivityCapabilities } from '@/core/native';

/** One capability row: the value is `null` when Android does not report it. */
export type CapabilityRow = {
  id: string;
  label: string;
  supported: boolean | null;
};

export type CapabilityGroup = {
  id: string;
  title: string;
  rows: CapabilityRow[];
};

/** The `PackageManager.FEATURE_*` names the curated rows check. */
export const FEATURES = {
  bluetooth: 'android.hardware.bluetooth',
  bluetoothLe: 'android.hardware.bluetooth_le',
  nfc: 'android.hardware.nfc',
  nfcHce: 'android.hardware.nfc.hce',
  uwb: 'android.hardware.uwb',
  wifi: 'android.hardware.wifi',
  wifiDirect: 'android.hardware.wifi.direct',
  wifiAware: 'android.hardware.wifi.aware',
  wifiRtt: 'android.hardware.wifi.rtt',
  wifiPasspoint: 'android.hardware.wifi.passpoint',
  usbHost: 'android.hardware.usb.host',
  usbAccessory: 'android.hardware.usb.accessory',
  gps: 'android.hardware.location.gps',
  networkLocation: 'android.hardware.location.network',
  consumerIr: 'android.hardware.consumerir',
  telephony: 'android.hardware.telephony',
  telephonyCalling: 'android.hardware.telephony.calling',
  telephonyData: 'android.hardware.telephony.data',
  telephonyMessaging: 'android.hardware.telephony.messaging',
  telephonyEuicc: 'android.hardware.telephony.euicc',
  telephonyCdma: 'android.hardware.telephony.cdma',
  telephonyGsm: 'android.hardware.telephony.gsm',
  telephonyIms: 'android.hardware.telephony.ims',
} as const;

export type CapabilityInput = {
  capabilities: ConnectivityCapabilities | null;
};

function has(features: readonly string[], feature: string): boolean {
  return features.includes(feature);
}

/**
 * The curated capability rows, grouped for the Connectivity screen. A row is
 * `null` when the OS does not report the capability — never guessed.
 */
export function buildCapabilityGroups(input: CapabilityInput): CapabilityGroup[] {
  const features = input.capabilities?.systemFeatures ?? [];
  const wifi = input.capabilities?.wifi ?? null;
  const ble = input.capabilities?.bluetooth ?? null;

  return [
    {
      id: 'radios',
      title: 'Radios',
      rows: [
        {
          id: 'bluetooth',
          label: 'Bluetooth',
          supported: features.length > 0 ? has(features, FEATURES.bluetooth) : null,
        },
        {
          id: 'bluetooth-le',
          label: 'Bluetooth LE',
          supported: features.length > 0 ? has(features, FEATURES.bluetoothLe) : null,
        },
        {
          id: 'bluetooth-le-audio',
          label: 'LE Audio (Bluetooth 5.2)',
          supported: ble?.leAudio ?? null,
        },
        { id: 'bluetooth-le-2m', label: 'LE 2M PHY', supported: ble?.le2mPhy ?? null },
        {
          id: 'bluetooth-le-coded',
          label: 'LE Coded PHY (long range)',
          supported: ble?.leCodedPhy ?? null,
        },
        {
          id: 'bluetooth-le-ext-adv',
          label: 'LE extended advertising',
          supported: ble?.leExtendedAdvertising ?? null,
        },
        {
          id: 'bluetooth-le-periodic-adv',
          label: 'LE periodic advertising',
          supported: ble?.lePeriodicAdvertising ?? null,
        },
        {
          id: 'bluetooth-multi-adv',
          label: 'Multiple advertisement',
          supported: ble?.multipleAdvertisement ?? null,
        },
        {
          id: 'nfc',
          label: 'NFC',
          supported: features.length > 0 ? has(features, FEATURES.nfc) : null,
        },
        {
          id: 'nfc-hce',
          label: 'Host card emulation (HCE)',
          supported: features.length > 0 ? has(features, FEATURES.nfcHce) : null,
        },
        {
          id: 'uwb',
          label: 'UWB (ultra-wideband)',
          supported: features.length > 0 ? has(features, FEATURES.uwb) : null,
        },
      ],
    },
    {
      id: 'wifi',
      title: 'Wi-Fi capabilities',
      rows: [
        {
          id: 'wifi',
          label: 'Wi-Fi',
          supported: features.length > 0 ? has(features, FEATURES.wifi) : null,
        },
        { id: 'wifi-5ghz', label: '5 GHz band', supported: wifi?.fiveGhz ?? null },
        { id: 'wifi-6ghz', label: '6 GHz band (Wi-Fi 6E)', supported: wifi?.sixGhz ?? null },
        { id: 'wifi-6', label: 'Wi-Fi 6 (ax)', supported: wifi?.wifi6 ?? null },
        { id: 'wifi-7', label: 'Wi-Fi 7 (be)', supported: wifi?.wifi7 ?? null },
        {
          id: 'wifi-direct',
          label: 'Wi-Fi Direct',
          supported: features.length > 0 ? has(features, FEATURES.wifiDirect) : null,
        },
        {
          id: 'wifi-aware',
          label: 'Wi-Fi Aware',
          supported: features.length > 0 ? has(features, FEATURES.wifiAware) : null,
        },
        {
          id: 'wifi-rtt',
          label: 'Wi-Fi RTT (range finding)',
          supported: features.length > 0 ? has(features, FEATURES.wifiRtt) : null,
        },
        {
          id: 'wifi-passpoint',
          label: 'Passpoint (Hotspot 2.0)',
          supported: features.length > 0 ? has(features, FEATURES.wifiPasspoint) : null,
        },
      ],
    },
    {
      id: 'wired',
      title: 'Wired & positioning',
      rows: [
        {
          id: 'usb-host',
          label: 'USB host',
          supported: features.length > 0 ? has(features, FEATURES.usbHost) : null,
        },
        {
          id: 'usb-accessory',
          label: 'USB accessory',
          supported: features.length > 0 ? has(features, FEATURES.usbAccessory) : null,
        },
        {
          id: 'gps',
          label: 'GPS',
          supported: features.length > 0 ? has(features, FEATURES.gps) : null,
        },
        {
          id: 'network-location',
          label: 'Network location',
          supported: features.length > 0 ? has(features, FEATURES.networkLocation) : null,
        },
        {
          id: 'infrared',
          label: 'Infrared (IR blaster)',
          supported: features.length > 0 ? has(features, FEATURES.consumerIr) : null,
        },
      ],
    },
    {
      id: 'telephony',
      title: 'Telephony',
      rows: [
        {
          id: 'telephony',
          label: 'Telephony',
          supported: features.length > 0 ? has(features, FEATURES.telephony) : null,
        },
        {
          id: 'telephony-calling',
          label: 'Calls',
          supported: features.length > 0 ? has(features, FEATURES.telephonyCalling) : null,
        },
        {
          id: 'telephony-data',
          label: 'Mobile data',
          supported: features.length > 0 ? has(features, FEATURES.telephonyData) : null,
        },
        {
          id: 'telephony-messaging',
          label: 'Messaging',
          supported: features.length > 0 ? has(features, FEATURES.telephonyMessaging) : null,
        },
        {
          id: 'telephony-euicc',
          label: 'eSIM (eUICC)',
          supported: features.length > 0 ? has(features, FEATURES.telephonyEuicc) : null,
        },
        {
          id: 'telephony-ims',
          label: 'IMS (VoLTE / VoWiFi)',
          supported: features.length > 0 ? has(features, FEATURES.telephonyIms) : null,
        },
        {
          id: 'telephony-cdma',
          label: 'CDMA',
          supported: features.length > 0 ? has(features, FEATURES.telephonyCdma) : null,
        },
        {
          id: 'telephony-gsm',
          label: 'GSM',
          supported: features.length > 0 ? has(features, FEATURES.telephonyGsm) : null,
        },
      ],
    },
  ];
}

export type SystemFeatureGroup = {
  /** Prefix such as "android.hardware.sensor" or "com.google". */
  id: string;
  features: string[];
};

/**
 * Groups every system feature by its prefix: "android." plus the next segment,
 * or the first two segments for vendor features. Sorted for a stable list.
 */
export function groupSystemFeatures(features: readonly string[]): SystemFeatureGroup[] {
  const groups = new Map<string, string[]>();
  for (const feature of features) {
    const parts = feature.split('.').filter((part) => part.length > 0);
    const base = parts[0] === 'android' ? parts.slice(1) : parts;
    const prefixParts = base.slice(0, base.length <= 2 ? base.length : 2);
    const id = prefixParts.join('.') || feature;
    const list = groups.get(id);
    if (list) {
      if (!list.includes(feature)) list.push(feature);
    } else {
      groups.set(id, [feature]);
    }
  }
  return [...groups.entries()]
    .map(([id, list]) => ({ id, features: [...list].sort(compareFeatureNames) }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

function compareFeatureNames(a: string, b: string): number {
  return a.localeCompare(b);
}

/** Case-insensitive search across the grouped feature list. */
export function filterSystemFeatures(
  groups: SystemFeatureGroup[],
  query: string,
): SystemFeatureGroup[] {
  const needle = query.trim().toLowerCase();
  if (needle === '') return groups;
  return groups
    .map((group) => ({
      id: group.id,
      features: group.features.filter((feature) => feature.toLowerCase().includes(needle)),
    }))
    .filter((group) => group.features.length > 0);
}

export function countSystemFeatures(groups: SystemFeatureGroup[]): number {
  return groups.reduce((total, group) => total + group.features.length, 0);
}

/** Wording for a capability row: `null` means the OS did not report it. */
export function capabilityLabel(supported: boolean | null): string {
  if (supported === null) return 'Not reported';
  return supported ? 'Supported' : 'No';
}
