import { useRouter } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';

import { isEnabled, features } from '@/core/features';
import { openAppSettings, type UsePermission } from '@/core/permissions';
import { useFormatters } from '@/core/units/use-formatters';
import {
  AdSlot,
  Button,
  Card,
  Chip,
  CopyableText,
  InfoSheet,
  OpenSettingsDialog,
  PermissionBanner,
  PermissionRationaleSheet,
  Screen,
  SectionHeader,
  Skeleton,
  StatRow,
} from '@/design-system/components';
import { withAlpha } from '@/design-system/color';
import { copyValue } from '@/design-system/copy/copy-value';
import { Icon, type IconName } from '@/design-system/icon';
import { MASKED_VALUE } from '@/design-system/privacy/sensitive-value';
import { useTheme } from '@/design-system/theme';
import { radius, spacing, typography } from '@/design-system/tokens';
import { SignalBars } from '@/design-system/visuals';
import { useSettingsStore } from '@/state/settings-store';
import { useNetwork } from '@/features/network/hooks/use-network';
import {
  connectionTypeLabel,
  formatDnsServers,
  formatLinkSpeed,
  formatSubnet,
  formatTxRxSpeeds,
  onOffLabel,
  privateDnsLabel,
  proxyLabel,
  roamingLabel,
  signalBarsFromDbm,
  signalSummary,
  supportLabel,
  vpnLabel,
  wifiBandAndChannelLabel,
  wifiChannelWidthLabel,
  wifiStandardLabel,
} from '@/features/network/services/network-service';
import type { NetworkPermissionKind } from '@/features/network/types';

const NOT_AVAILABLE = 'Not available on this device';

type SectionId = 'connection' | 'wifi' | 'radios' | 'shortcuts';

/** "What this means" copy, one sheet per section. */
const SHEETS: Record<SectionId, { title: string; paragraphs: string[] }> = {
  connection: {
    title: 'Connection: what this means',
    paragraphs: [
      'The type chip shows the transport Android currently uses. When a VPN is active, apps see the VPN while the phone still runs on Wi-Fi or mobile data underneath.',
      'IPv4 and IPv6 are this phone’s addresses on the local network. The subnet shows how large that local network is, and the gateway is the router that leads onward.',
      'DNS servers turn names into addresses; Private DNS sends those lookups encrypted. “Metered” means Android treats the connection as limited — that is what Data Saver restricts.',
      'Roaming is shown on mobile networks only: it means the phone is registered outside its operator’s home network.',
    ],
  },
  wifi: {
    title: 'Wi-Fi: what this means',
    paragraphs: [
      'The link speed is the current negotiated rate between the phone and the access point — not the speed of your internet connection.',
      'TX / RX are the transmit and receive rates Android 11+ reports separately; the standard (Wi-Fi 4/5/6/7) is the radio generation in use on this link.',
      'Signal is measured in dBm: −30 is excellent, −70 is usable, below −80 is weak.',
      'The name and the channel width come from Android’s scan data, which Android treats as location — they appear once the location permission is allowed.',
    ],
  },
  radios: {
    title: 'Bluetooth & NFC: what this means',
    paragraphs: [
      'Bluetooth on/off is a state read; Android 12 and newer require the Nearby devices permission to see it.',
      'NFC allows short-range taps for payments or tags. This app only reports whether NFC is on — it never reads tags or payment data.',
      'The Connectivity screen lists the deeper radio features (LE Audio, Wi-Fi Direct, UWB, USB, GNSS) and every system feature Android reports for this device.',
    ],
  },
  shortcuts: {
    title: 'Shortcuts: what this means',
    paragraphs: [
      'Android does not let apps switch Wi-Fi, Bluetooth, mobile data or airplane mode on and off. Each button opens the matching system screen, which is the only honest way to change these settings.',
      'NFC is read-only here; switching it happens in the system NFC settings.',
    ],
  },
};

/** Copy for the two permission flows, kept together for review. */
const PERMISSIONS: Record<
  NetworkPermissionKind,
  {
    bannerTitle: string;
    bannerMessage: string;
    sheetTitle: string;
    sheetMessage: string;
    sheetFooter: string;
    settingsMessage: string;
  }
> = {
  'wifi-name': {
    bannerTitle: 'See the Wi-Fi name',
    bannerMessage: 'Android treats Wi-Fi network names as location data.',
    sheetTitle: 'See the Wi-Fi name',
    sheetMessage:
      'Reading the Wi-Fi network name asks for the location permission, because Android treats Wi-Fi network names as location data.',
    sheetFooter: 'The band, channel, link speed and signal stay visible either way.',
    settingsMessage:
      'The location permission is set to "don\'t ask again". Open this app\'s settings to allow it.',
  },
  bluetooth: {
    bannerTitle: 'See the Bluetooth state',
    bannerMessage: 'Android 12 and newer need the Nearby devices permission to read it.',
    sheetTitle: 'See the Bluetooth state',
    sheetMessage:
      'Android 12 and newer require the "Nearby devices" permission to read whether Bluetooth is on.',
    sheetFooter: 'The app never scans for, connects to or changes any Bluetooth device.',
    settingsMessage:
      'The Nearby devices permission is set to "don\'t ask again". Open this app\'s settings to allow it.',
  },
};

type ExploreTarget = {
  icon: IconName;
  title: string;
  subtitle: string;
  onPress: () => void;
};

/** Network: connection, Wi-Fi details, the radio shortcuts and the deep screens. */
export function NetworkScreen() {
  const { colors } = useTheme();
  const { units } = useFormatters();
  const router = useRouter();
  const {
    connectivity,
    wifi,
    bluetooth,
    nfc,
    location,
    bluetoothPermission,
    notice,
    openSettings,
    refreshing,
    refresh,
  } = useNetwork();

  const [sheet, setSheet] = useState<NetworkPermissionKind | null>(null);
  const [settingsDialog, setSettingsDialog] = useState<NetworkPermissionKind | null>(null);
  const [sectionSheet, setSectionSheet] = useState<SectionId | null>(null);
  const hideSensitiveValues = useSettingsStore((state) => state.hideSensitiveValues);

  const permissionFor = (kind: NetworkPermissionKind): UsePermission =>
    kind === 'wifi-name' ? location : bluetoothPermission;

  const askOrOpenSettings = (kind: NetworkPermissionKind) => {
    if (permissionFor(kind).canAskAgain) setSheet(kind);
    else setSettingsDialog(kind);
  };

  const allow = async (kind: NetworkPermissionKind) => {
    setSheet(null);
    const next = await permissionFor(kind).request();
    if (next === 'granted') refresh();
    else if (next === 'blocked') setSettingsDialog(kind);
  };

  const conn = connectivity?.status === 'ok' ? connectivity.value : null;
  const wifiValue = wifi?.status === 'ok' ? wifi.value : null;
  const bt = bluetooth?.status === 'ok' ? bluetooth.value : null;
  const nfcValue = nfc?.status === 'ok' ? nfc.value : null;

  const bars = wifiValue === null ? null : signalBarsFromDbm(wifiValue.rssiDbm);

  const wifiNameValue = !location.granted
    ? 'Hidden until allowed'
    : wifiValue === null
      ? NOT_AVAILABLE
      : wifiValue.connected
        ? (wifiValue.ssid ?? NOT_AVAILABLE)
        : 'Not connected';

  /** Only a real reported name is a value worth masking. */
  const ssidSensitive =
    location.granted && wifiValue?.connected === true && (wifiValue?.ssid?.trim().length ?? 0) > 0;

  /** Copy text uses the same masking as the rows while the setting is on. */
  const maskRaw = (value: string | null | undefined): string => {
    const raw = value?.trim();
    if (raw == null || raw.length === 0) return NOT_AVAILABLE;
    return hideSensitiveValues ? MASKED_VALUE : raw;
  };

  const channelWidthValue = !location.granted
    ? 'Hidden until allowed'
    : (wifiChannelWidthLabel(wifiValue?.channelWidthCode ?? null) ?? NOT_AVAILABLE);

  const signalValue = signalSummary(wifiValue?.rssiDbm ?? null, bars) ?? NOT_AVAILABLE;

  const connectionCopy = conn
    ? [
        `Connection: ${connectionTypeLabel(conn.type)}`,
        `Metered: ${onOffLabel(conn.metered) ?? NOT_AVAILABLE}`,
        `VPN: ${vpnLabel(conn.vpnActive)}`,
        `Data Saver: ${onOffLabel(conn.dataSaver) ?? NOT_AVAILABLE}`,
        `Airplane mode: ${onOffLabel(conn.airplaneMode) ?? NOT_AVAILABLE}`,
        `Mobile operator: ${conn.operatorName ?? NOT_AVAILABLE}`,
        conn.roaming === null ? null : `Roaming: ${roamingLabel(conn.roaming) ?? NOT_AVAILABLE}`,
        `Private DNS: ${privateDnsLabel(conn.privateDnsMode, conn.privateDnsHost) ?? NOT_AVAILABLE}`,
        `IPv4: ${maskRaw(conn.ipv4)}`,
        `IPv6: ${maskRaw(conn.ipv6)}`,
        `Subnet: ${formatSubnet(conn.subnetPrefix) ?? NOT_AVAILABLE}`,
        `Gateway: ${maskRaw(conn.gateway)}`,
        `DNS: ${maskRaw(formatDnsServers(conn.dnsServers))}`,
        `Proxy: ${proxyLabel(conn.proxyHost, conn.proxyPort, conn.proxyPacUrl) ?? 'None'}`,
      ]
        .filter((line): line is string => line != null)
        .join('\n')
    : undefined;

  const wifiCopy = wifiValue
    ? [
        `Wi-Fi: ${wifiValue.enabled === null ? 'Unknown' : wifiValue.enabled ? 'On' : 'Off'}`,
        `Network: ${maskRaw(
          location.granted && wifiValue.connected ? (wifiValue.ssid ?? null) : wifiNameValue,
        )}`,
        `Link speed: ${formatLinkSpeed(wifiValue.linkSpeedMbps, units) ?? NOT_AVAILABLE}`,
        `Link speed (TX / RX): ${
          formatTxRxSpeeds(wifiValue.txLinkSpeedMbps, wifiValue.rxLinkSpeedMbps, units) ??
          NOT_AVAILABLE
        }`,
        `Band & channel: ${wifiBandAndChannelLabel(wifiValue.frequencyMhz) ?? NOT_AVAILABLE}`,
        `Channel width: ${channelWidthValue}`,
        `Standard: ${wifiStandardLabel(wifiValue.standardCode) ?? NOT_AVAILABLE}`,
        `Signal: ${signalValue}`,
      ].join('\n')
    : undefined;

  const radiosCopy = [
    `Bluetooth: ${bt ? (onOffLabel(bt.enabled) ?? NOT_AVAILABLE) : NOT_AVAILABLE}`,
    `Bluetooth LE: ${bt ? supportLabel(bt.leSupported) : NOT_AVAILABLE}`,
    `NFC: ${nfcValue ? (onOffLabel(nfcValue.enabled) ?? NOT_AVAILABLE) : NOT_AVAILABLE}`,
  ].join('\n');

  // Banners only appear after the first check and never for absent hardware.
  const showWifiBanner =
    !location.granted && location.state !== 'checking' && wifi?.status !== 'unavailable';
  const showBluetoothBanner =
    !bluetoothPermission.granted &&
    bluetoothPermission.state !== 'checking' &&
    bluetooth?.status !== 'unavailable';

  const explore: ExploreTarget[] = [
    {
      icon: 'signal',
      title: 'Connectivity & features',
      subtitle: 'Bluetooth, NFC, UWB, USB, GNSS and every system feature Android reports',
      onPress: () => router.push('/connectivity'),
    },
    ...(isEnabled(features.nearbyWifi)
      ? [
          {
            icon: 'wifi' as IconName,
            title: 'Wi-Fi analyzer',
            subtitle: 'Nearby networks, channels, signal and estimated distance',
            onPress: () => router.push('/wifi-analyzer'),
          },
        ]
      : []),
    {
      icon: 'gauge',
      title: 'Data usage',
      subtitle: 'Wi-Fi and mobile traffic per day, with the apps behind it',
      onPress: () => router.push('/data-usage'),
    },
  ];

  return (
    <Screen
      scroll
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
          colors={[colors.accent]}
          progressBackgroundColor={colors.surface2}
          tintColor={colors.accent}
        />
      }
      contentStyle={styles.content}
    >
      {connectivity === null ? (
        <NetworkSkeleton />
      ) : (
        <>
          <SectionHeader
            title="Connection"
            action={conn ? <Chip label={connectionTypeLabel(conn.type)} /> : undefined}
            copyText={connectionCopy}
            onInfo={() => setSectionSheet('connection')}
          />
          <Card>
            <View style={styles.cardBody}>
              {conn ? (
                <>
                  <StatRow label="Metered" value={onOffLabel(conn.metered) ?? NOT_AVAILABLE} />
                  <StatRow label="VPN" value={vpnLabel(conn.vpnActive)} />
                  <StatRow label="Data Saver" value={onOffLabel(conn.dataSaver) ?? NOT_AVAILABLE} />
                  <StatRow
                    label="Airplane mode"
                    value={onOffLabel(conn.airplaneMode) ?? NOT_AVAILABLE}
                  />
                  <StatRow label="Mobile operator" value={conn.operatorName ?? NOT_AVAILABLE} />
                  {conn.roaming !== null ? (
                    <StatRow label="Roaming" value={roamingLabel(conn.roaming) ?? NOT_AVAILABLE} />
                  ) : null}
                  <StatRow
                    label="Private DNS"
                    value={
                      privateDnsLabel(conn.privateDnsMode, conn.privateDnsHost) ?? NOT_AVAILABLE
                    }
                  />
                  <StatRow label="IPv4" value={conn.ipv4 ?? NOT_AVAILABLE} sensitive />
                  <StatRow label="IPv6" value={conn.ipv6 ?? NOT_AVAILABLE} sensitive />
                  <StatRow
                    label="Subnet"
                    value={formatSubnet(conn.subnetPrefix) ?? NOT_AVAILABLE}
                  />
                  <StatRow label="Gateway" value={conn.gateway ?? NOT_AVAILABLE} sensitive />
                  <StatRow
                    label="DNS"
                    value={formatDnsServers(conn.dnsServers) ?? NOT_AVAILABLE}
                    sensitive
                  />
                  <StatRow
                    label="Proxy"
                    value={proxyLabel(conn.proxyHost, conn.proxyPort, conn.proxyPacUrl) ?? 'None'}
                  />
                </>
              ) : (
                <Text style={[styles.unavailableTitle, { color: colors.text }]}>
                  {connectivity.status === 'unavailable' ? NOT_AVAILABLE : 'Permission needed.'}
                </Text>
              )}
            </View>
          </Card>

          <AdSlot placement="network-connection" />

          <SectionHeader
            title="Wi-Fi"
            action={
              wifiValue ? (
                <Chip
                  label={wifiValue.enabled === null ? 'Unknown' : wifiValue.enabled ? 'On' : 'Off'}
                  dotColor={wifiValue.enabled ? colors.good : undefined}
                  onLongPress={
                    wifiValue.enabled === null
                      ? undefined
                      : () => void copyValue(wifiValue.enabled ? 'On' : 'Off', 'Wi-Fi state')
                  }
                />
              ) : undefined
            }
            copyText={wifiCopy}
            onInfo={() => setSectionSheet('wifi')}
          />
          <Card>
            <View style={styles.cardBody}>
              {showWifiBanner ? (
                <PermissionBanner
                  icon="wifi"
                  title={PERMISSIONS['wifi-name'].bannerTitle}
                  message={PERMISSIONS['wifi-name'].bannerMessage}
                  actionLabel={location.canAskAgain ? 'Allow' : 'Open settings'}
                  onAction={() => askOrOpenSettings('wifi-name')}
                />
              ) : null}
              <StatRow label="Network" value={wifiNameValue} sensitive={ssidSensitive} />
              <StatRow
                label="Link speed"
                value={formatLinkSpeed(wifiValue?.linkSpeedMbps ?? null, units) ?? NOT_AVAILABLE}
              />
              <StatRow
                label="Link speed (TX / RX)"
                value={
                  formatTxRxSpeeds(
                    wifiValue?.txLinkSpeedMbps ?? null,
                    wifiValue?.rxLinkSpeedMbps ?? null,
                    units,
                  ) ?? NOT_AVAILABLE
                }
              />
              <StatRow
                label="Band & channel"
                value={wifiBandAndChannelLabel(wifiValue?.frequencyMhz ?? null) ?? NOT_AVAILABLE}
              />
              <StatRow label="Channel width" value={channelWidthValue} />
              <StatRow
                label="Standard"
                value={wifiStandardLabel(wifiValue?.standardCode ?? null) ?? NOT_AVAILABLE}
              />
              <View style={styles.signalRow}>
                <Text style={[styles.signalLabel, { color: colors.muted }]}>Signal</Text>
                <View style={styles.signalValue}>
                  <SignalBars level={bars} />
                  <CopyableText
                    value={signalValue}
                    copyLabel="Signal"
                    style={[styles.signalText, { color: colors.text }]}
                  >
                    {signalValue}
                  </CopyableText>
                </View>
              </View>
              <View style={styles.actions}>
                <Button
                  title="Connect / disconnect Wi-Fi"
                  icon="wifi"
                  variant="secondary"
                  onPress={() => openSettings('internet-panel')}
                />
                <Text style={[styles.caption, { color: colors.muted }]}>
                  Opens the system internet panel — Android keeps Wi-Fi switching outside apps.
                </Text>
              </View>
            </View>
          </Card>

          <SectionHeader
            title="Bluetooth & NFC"
            copyText={radiosCopy}
            onInfo={() => setSectionSheet('radios')}
          />
          <Card>
            <View style={styles.cardBody}>
              {showBluetoothBanner ? (
                <PermissionBanner
                  icon="bluetooth"
                  title={PERMISSIONS.bluetooth.bannerTitle}
                  message={PERMISSIONS.bluetooth.bannerMessage}
                  actionLabel={bluetoothPermission.canAskAgain ? 'Allow' : 'Open settings'}
                  onAction={() => askOrOpenSettings('bluetooth')}
                />
              ) : (
                <>
                  <StatRow
                    label="Bluetooth"
                    value={bt ? (onOffLabel(bt.enabled) ?? NOT_AVAILABLE) : NOT_AVAILABLE}
                  />
                  <StatRow
                    label="Bluetooth LE"
                    value={bt ? supportLabel(bt.leSupported) : NOT_AVAILABLE}
                  />
                </>
              )}
              <StatRow
                label="NFC"
                value={nfcValue ? (onOffLabel(nfcValue.enabled) ?? NOT_AVAILABLE) : NOT_AVAILABLE}
              />
            </View>
          </Card>

          <SectionHeader title="Explore" />
          {explore.map((target) => (
            <Card key={target.title} onPress={target.onPress}>
              <View style={styles.linkRow}>
                <View
                  style={[styles.linkBadge, { backgroundColor: withAlpha(colors.accent, 0.12) }]}
                >
                  <Icon name={target.icon} size={20} color={colors.accent} />
                </View>
                <View style={styles.linkLabels}>
                  <Text style={[styles.linkTitle, { color: colors.text }]}>{target.title}</Text>
                  <Text style={[styles.caption, { color: colors.muted }]}>{target.subtitle}</Text>
                </View>
                <Icon name="chevron-right" size={20} color={colors.muted} />
              </View>
            </Card>
          ))}

          <SectionHeader title="Shortcuts" onInfo={() => setSectionSheet('shortcuts')} />
          <Card>
            <View style={styles.cardBody}>
              <View style={styles.actions}>
                <Button
                  title="Bluetooth settings"
                  icon="bluetooth"
                  variant="secondary"
                  onPress={() => openSettings('bluetooth')}
                />
                <Button
                  title="Mobile data settings"
                  icon="signal"
                  variant="secondary"
                  onPress={() => openSettings('mobile-data')}
                />
                <Button
                  title="NFC settings"
                  icon="nfc"
                  variant="secondary"
                  onPress={() => openSettings('nfc')}
                />
                <Button
                  title="Airplane mode settings"
                  icon="airplane"
                  variant="secondary"
                  onPress={() => openSettings('airplane')}
                />
              </View>
              {notice ? (
                <Text style={[styles.caption, { color: colors.muted }]}>{notice}</Text>
              ) : null}
            </View>
          </Card>

          <AdSlot placement="network-end" />
        </>
      )}

      <PermissionRationaleSheet
        visible={sheet === 'wifi-name'}
        title={PERMISSIONS['wifi-name'].sheetTitle}
        message={PERMISSIONS['wifi-name'].sheetMessage}
        footer={PERMISSIONS['wifi-name'].sheetFooter}
        onAllow={() => void allow('wifi-name')}
        onCancel={() => setSheet(null)}
      />
      <PermissionRationaleSheet
        visible={sheet === 'bluetooth'}
        title={PERMISSIONS.bluetooth.sheetTitle}
        message={PERMISSIONS.bluetooth.sheetMessage}
        footer={PERMISSIONS.bluetooth.sheetFooter}
        onAllow={() => void allow('bluetooth')}
        onCancel={() => setSheet(null)}
      />
      <OpenSettingsDialog
        visible={settingsDialog !== null}
        message={settingsDialog === null ? '' : PERMISSIONS[settingsDialog].settingsMessage}
        onOpen={() => {
          setSettingsDialog(null);
          openAppSettings();
        }}
        onCancel={() => setSettingsDialog(null)}
      />

      {sectionSheet !== null ? (
        <InfoSheet
          visible
          title={SHEETS[sectionSheet].title}
          paragraphs={SHEETS[sectionSheet].paragraphs}
          onClose={() => setSectionSheet(null)}
        />
      ) : null}
    </Screen>
  );
}

function NetworkSkeleton() {
  return (
    <View style={styles.content}>
      {[0, 1].map((card) => (
        <Card key={card}>
          <View style={styles.cardBody}>
            <Skeleton width="40%" height={14} />
            {[0, 1, 2].map((row) => (
              <Skeleton key={row} height={16} />
            ))}
          </View>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  cardBody: {
    gap: spacing.sm,
  },
  caption: {
    ...typography.caption,
  },
  unavailableTitle: {
    ...typography.body,
  },
  signalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  signalLabel: {
    ...typography.body,
    flexShrink: 1,
  },
  signalValue: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    flexShrink: 1,
  },
  signalText: {
    ...typography.mono,
    textAlign: 'right',
  },
  actions: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  linkBadge: {
    width: 36,
    height: 36,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkLabels: {
    flex: 1,
    gap: 2,
  },
  linkTitle: {
    ...typography.body,
    fontFamily: 'Inter_600SemiBold',
  },
});
