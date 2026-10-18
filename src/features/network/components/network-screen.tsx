import { useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';

import { openAppSettings, type UsePermission } from '@/core/permissions';
import {
  AdSlot,
  Button,
  Card,
  Chip,
  OpenSettingsDialog,
  PermissionBanner,
  PermissionRationaleSheet,
  Screen,
  Skeleton,
  StatRow,
} from '@/design-system/components';
import { useTheme } from '@/design-system/theme';
import { spacing, typography } from '@/design-system/tokens';
import { SignalBars } from '@/design-system/visuals';
import { useNetwork } from '@/features/network/hooks/use-network';
import {
  connectionTypeLabel,
  formatDnsServers,
  formatIp,
  formatLinkSpeed,
  onOffLabel,
  privateDnsLabel,
  signalBarsFromDbm,
  signalSummary,
  supportLabel,
  vpnLabel,
  wifiBandAndChannelLabel,
  wifiStandardLabel,
} from '@/features/network/services/network-service';
import type { NetworkPermissionKind } from '@/features/network/types';

const NOT_AVAILABLE = 'Not available on this device';

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

/** Network: connection, Wi-Fi details and the radio shortcuts. */
export function NetworkScreen() {
  const { colors } = useTheme();
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

  // Banners only appear after the first check and never for absent hardware.
  const showWifiBanner =
    !location.granted && location.state !== 'checking' && wifi?.status !== 'unavailable';
  const showBluetoothBanner =
    !bluetoothPermission.granted &&
    bluetoothPermission.state !== 'checking' &&
    bluetooth?.status !== 'unavailable';

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
          <Card>
            <View style={styles.cardBody}>
              <View style={styles.cardHead}>
                <Text style={[styles.sectionTitle, { color: colors.muted }]}>Connection</Text>
                {conn ? <Chip label={connectionTypeLabel(conn.type)} /> : null}
              </View>
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
                  <StatRow
                    label="Private DNS"
                    value={
                      privateDnsLabel(conn.privateDnsMode, conn.privateDnsHost) ?? NOT_AVAILABLE
                    }
                  />
                  <StatRow
                    label="Local IP"
                    value={formatIp(conn.ipv4, conn.ipv6) ?? NOT_AVAILABLE}
                  />
                  <StatRow label="Gateway" value={conn.gateway ?? NOT_AVAILABLE} />
                  <StatRow label="DNS" value={formatDnsServers(conn.dnsServers) ?? NOT_AVAILABLE} />
                </>
              ) : (
                <Text style={[styles.unavailableTitle, { color: colors.text }]}>
                  {connectivity.status === 'unavailable' ? NOT_AVAILABLE : 'Permission needed.'}
                </Text>
              )}
            </View>
          </Card>

          <AdSlot />

          <Card>
            <View style={styles.cardBody}>
              <View style={styles.cardHead}>
                <Text style={[styles.sectionTitle, { color: colors.muted }]}>Wi-Fi</Text>
                {wifiValue ? (
                  <Chip
                    label={
                      wifiValue.enabled === null ? 'Unknown' : wifiValue.enabled ? 'On' : 'Off'
                    }
                    dotColor={wifiValue.enabled ? colors.good : undefined}
                  />
                ) : null}
              </View>
              {showWifiBanner ? (
                <PermissionBanner
                  icon="wifi"
                  title={PERMISSIONS['wifi-name'].bannerTitle}
                  message={PERMISSIONS['wifi-name'].bannerMessage}
                  actionLabel={location.canAskAgain ? 'Allow' : 'Open settings'}
                  onAction={() => askOrOpenSettings('wifi-name')}
                />
              ) : null}
              <StatRow label="Network" value={wifiNameValue} />
              <StatRow
                label="Link speed"
                value={formatLinkSpeed(wifiValue?.linkSpeedMbps ?? null) ?? NOT_AVAILABLE}
              />
              <StatRow
                label="Band & channel"
                value={wifiBandAndChannelLabel(wifiValue?.frequencyMhz ?? null) ?? NOT_AVAILABLE}
              />
              <StatRow
                label="Standard"
                value={wifiStandardLabel(wifiValue?.standardCode ?? null) ?? NOT_AVAILABLE}
              />
              <View style={styles.signalRow}>
                <Text style={[styles.signalLabel, { color: colors.muted }]}>Signal</Text>
                <View style={styles.signalValue}>
                  <SignalBars level={bars} />
                  <Text style={[styles.signalText, { color: colors.text }]}>
                    {signalSummary(wifiValue?.rssiDbm ?? null, bars) ?? NOT_AVAILABLE}
                  </Text>
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

          <Card>
            <View style={styles.cardBody}>
              <Text style={[styles.sectionTitle, { color: colors.muted }]}>Bluetooth & NFC</Text>
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

          <Card>
            <View style={styles.cardBody}>
              <Text style={[styles.sectionTitle, { color: colors.muted }]}>Shortcuts</Text>
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
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.caption,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
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
});
