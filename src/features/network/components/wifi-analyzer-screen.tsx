import { useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';

import { openAppSettings } from '@/core/permissions';
import {
  Button,
  Card,
  Chip,
  EmptyState,
  InfoSheet,
  OpenSettingsDialog,
  PermissionBanner,
  PermissionRationaleSheet,
  Screen,
  SectionHeader,
} from '@/design-system/components';
import { useTheme } from '@/design-system/theme';
import { spacing, typography } from '@/design-system/tokens';
import { SignalBars } from '@/design-system/visuals';
import { ChannelGraph } from '@/features/network/components/channel-graph';
import { useWifiAnalyzer } from '@/features/network/hooks/use-wifi-analyzer';
import {
  BAND_FILTERS,
  filterNetworks,
  formatDistance,
  HIDDEN_SSID_LABEL,
  SORT_OPTIONS,
  scanAgeLabel,
  shortenBssid,
  sortNetworks,
  type AnalyzerNetwork,
  type WifiBandFilter,
  type WifiSort,
} from '@/features/network/services/wifi-analyzer-service';

const ANALYZER_SHEET = {
  title: 'Wi-Fi analyzer: what this means',
  paragraphs: [
    'The list comes from Android’s Wi-Fi scan cache. Android throttles scans to about four every two minutes, so the list can be a little older than it looks — the scan age is shown above it.',
    'Estimated distance uses the free-space path-loss formula: distance ≈ 10^((27.55 − 20·log10(f) + |RSSI|) / 20), with the frequency f in MHz. Walls, furniture and antenna direction change the real distance, so treat it as a rough guide.',
    'Names and addresses (BSSID) are location data to Android: they stay hidden until the location permission is allowed. The scan itself needs the Nearby devices permission on Android 13 and newer.',
    'The channel graphs draw each network as a bar centred on its channel with its channel width; where bars overlap, those networks share the same airtime. Everything stays on this phone — the app has no server.',
  ],
};

type PermissionFlow = 'scan' | 'names';

/** Wi-Fi analyzer: nearby networks, the scan list and channel-overlap graphs. */
export function WifiAnalyzerScreen() {
  const { colors } = useTheme();
  const {
    networks,
    lastScanAgeMs,
    scanThrottleEnabled,
    error,
    notice,
    scanning,
    location,
    nearby,
    needsNearbyPermission,
    scanPermissionGranted,
    namesGranted,
    scan,
    refresh,
  } = useWifiAnalyzer();

  const [band, setBand] = useState<WifiBandFilter>('all');
  const [sort, setSort] = useState<WifiSort>('signal');
  const [sheet, setSheet] = useState<PermissionFlow | null>(null);
  const [settingsDialog, setSettingsDialog] = useState<PermissionFlow | null>(null);
  const [infoVisible, setInfoVisible] = useState(false);

  const visible = useMemo(
    () => sortNetworks(filterNetworks(networks, band), sort),
    [networks, band, sort],
  );

  const age = scanAgeLabel(lastScanAgeMs);

  const askScan = () => {
    const permission = needsNearbyPermission ? nearby : location;
    if (permission.canAskAgain) setSheet('scan');
    else setSettingsDialog('scan');
  };

  const askNames = () => {
    if (location.canAskAgain) setSheet('names');
    else setSettingsDialog('names');
  };

  const allowScan = async () => {
    setSheet(null);
    if (needsNearbyPermission && !nearby.granted) {
      const next = await nearby.request();
      if (next === 'blocked') {
        setSettingsDialog('scan');
        return;
      }
    }
    if (!location.granted) {
      const next = await location.request();
      if (next === 'blocked') {
        setSettingsDialog('names');
        return;
      }
    }
    scan();
  };

  const allowNames = async () => {
    setSheet(null);
    const next = await location.request();
    if (next === 'blocked') setSettingsDialog('names');
    else refresh();
  };

  const showScanBanner = !scanPermissionGranted && nearby.state !== 'checking';
  const showNamesBanner =
    !showScanBanner && !namesGranted && location.state !== 'checking' && networks.length > 0;

  return (
    <Screen
      scroll
      refreshControl={
        <RefreshControl
          refreshing={scanning}
          onRefresh={scan}
          colors={[colors.accent]}
          progressBackgroundColor={colors.surface2}
          tintColor={colors.accent}
        />
      }
      contentStyle={styles.content}
    >
      <SectionHeader title="Scan" onInfo={() => setInfoVisible(true)} />
      <Card>
        <View style={styles.cardBody}>
          {showScanBanner ? (
            <PermissionBanner
              icon="wifi"
              title="Allow Wi-Fi scanning"
              message={
                needsNearbyPermission
                  ? 'Android 13 and newer need the Nearby devices permission before an app may scan for Wi-Fi networks.'
                  : 'Android needs the location permission before an app may scan for Wi-Fi networks.'
              }
              actionLabel={
                (needsNearbyPermission ? nearby.canAskAgain : location.canAskAgain)
                  ? 'Allow'
                  : 'Open settings'
              }
              onAction={askScan}
            />
          ) : null}
          {showNamesBanner ? (
            <PermissionBanner
              icon="wifi"
              title="See network names"
              message="Android treats Wi-Fi network names and addresses as location data."
              actionLabel={location.canAskAgain ? 'Allow' : 'Open settings'}
              onAction={askNames}
            />
          ) : null}
          <View style={styles.scanRow}>
            <Button
              title={scanning ? 'Scanning…' : 'Scan now'}
              icon="wifi"
              variant="secondary"
              disabled={scanning}
              onPress={scan}
              style={styles.scanButton}
            />
            <Text style={[styles.age, { color: colors.muted }]}>
              {age === null ? 'No scan yet' : `Last scan ${age}`}
            </Text>
          </View>
          {notice ? (
            <Text style={[styles.caption, { color: colors.warning }]}>{notice}</Text>
          ) : null}
          {error ? <Text style={[styles.caption, { color: colors.warning }]}>{error}</Text> : null}
          {scanThrottleEnabled === true ? (
            <Text style={[styles.caption, { color: colors.muted }]}>
              Android limits Wi-Fi scans to about four every two minutes.
            </Text>
          ) : null}
        </View>
      </Card>

      {networks.length === 0 ? (
        scanPermissionGranted ? (
          <EmptyState
            icon="wifi"
            title="No networks yet"
            message="Scan to list the Wi-Fi networks around you. Results stay on this phone."
            action={<Button title="Scan now" icon="wifi" onPress={scan} disabled={scanning} />}
          />
        ) : (
          <EmptyState
            icon="wifi"
            title="Wi-Fi analyzer"
            message="Allow Wi-Fi scanning to list the networks around you."
            action={<Button title="Allow" icon="wifi" onPress={askScan} />}
          />
        )
      ) : (
        <>
          <SectionHeader title="Channel overlap" onInfo={() => setInfoVisible(true)} />
          <Card>
            <View style={styles.cardBody}>
              <Text style={[styles.bandTitle, { color: colors.muted }]}>
                2.4 GHz · {networks.filter((network) => network.band === '2.4').length} networks
              </Text>
              <ChannelGraph networks={networks} band="2.4" />
              <Text style={[styles.bandTitle, { color: colors.muted }]}>
                5 GHz · {networks.filter((network) => network.band === '5').length} networks
              </Text>
              <ChannelGraph networks={networks} band="5" />
            </View>
          </Card>

          <SectionHeader title="Nearby networks" />
          <View style={styles.filters}>
            {BAND_FILTERS.map((option) => (
              <Chip
                key={option.id}
                label={option.label}
                selected={band === option.id}
                onPress={() => setBand(option.id)}
              />
            ))}
          </View>
          <View style={styles.filters}>
            {SORT_OPTIONS.map((option) => (
              <Chip
                key={option.id}
                label={`Sort: ${option.label}`}
                selected={sort === option.id}
                onPress={() => setSort(option.id)}
              />
            ))}
          </View>
          <Text style={[styles.caption, { color: colors.muted }]}>
            {visible.length === networks.length
              ? `${networks.length} networks`
              : `${visible.length} of ${networks.length} networks`}
          </Text>
          {visible.length === 0 ? (
            <Card>
              <Text style={[styles.emptyText, { color: colors.muted }]}>
                No networks on this band. Pick “All” to see the full scan.
              </Text>
            </Card>
          ) : (
            <Card>
              <View style={styles.listBody}>
                {visible.map((network, index) => (
                  <NetworkRow
                    key={networkKey(network, index)}
                    network={network}
                    divided={index > 0}
                  />
                ))}
              </View>
            </Card>
          )}
        </>
      )}

      <InfoSheet
        visible={infoVisible}
        title={ANALYZER_SHEET.title}
        paragraphs={ANALYZER_SHEET.paragraphs}
        onClose={() => setInfoVisible(false)}
      />

      <PermissionRationaleSheet
        visible={sheet === 'scan'}
        title="Allow Wi-Fi scanning"
        message={
          needsNearbyPermission
            ? 'Scanning for nearby Wi-Fi networks uses Android’s "Nearby devices" permission, and showing their names uses the location permission.'
            : 'Scanning for nearby Wi-Fi networks uses the location permission, because Android treats Wi-Fi names and addresses as location data.'
        }
        footer="Scan results and estimated distances stay on this phone."
        onAllow={() => void allowScan()}
        onCancel={() => setSheet(null)}
      />
      <PermissionRationaleSheet
        visible={sheet === 'names'}
        title="See network names"
        message="Android treats Wi-Fi network names and addresses as location data."
        footer="Without it, the scan still lists the networks — names and addresses show as hidden."
        onAllow={() => void allowNames()}
        onCancel={() => setSheet(null)}
      />
      <OpenSettingsDialog
        visible={settingsDialog !== null}
        message={
          settingsDialog === 'scan'
            ? needsNearbyPermission
              ? 'The Nearby devices permission is set to "don\'t ask again". Open this app\'s settings to allow it.'
              : 'The location permission is set to "don\'t ask again". Open this app\'s settings to allow it.'
            : 'The location permission is set to "don\'t ask again". Open this app\'s settings to allow it.'
        }
        onOpen={() => {
          setSettingsDialog(null);
          openAppSettings();
        }}
        onCancel={() => setSettingsDialog(null)}
      />
    </Screen>
  );
}

function networkKey(network: AnalyzerNetwork, index: number): string {
  return `${network.bssid ?? network.ssid ?? 'hidden'}-${network.frequencyMhz}-${index}`;
}

function NetworkRow({ network, divided }: { network: AnalyzerNetwork; divided: boolean }) {
  const { colors } = useTheme();
  const distance = formatDistance(network.distanceMeters);
  const details = [shortenBssid(network.bssid), network.security, network.standard ?? '—'].join(
    ' · ',
  );
  const link = [
    `${network.band === 'other' ? 'Unknown band' : `${network.band} GHz`}`,
    network.channel === null ? null : `channel ${network.channel}`,
    network.channelWidth,
  ]
    .filter(Boolean)
    .join(' · ');
  const label = `${network.ssid ?? HIDDEN_SSID_LABEL}, ${network.rssiDbm} dBm${
    distance ? `, ${distance} estimated` : ''
  }`;

  return (
    <View
      accessible
      accessibilityLabel={label}
      style={[
        styles.row,
        divided
          ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }
          : null,
      ]}
    >
      <SignalBars level={network.bars} />
      <View style={styles.rowBody}>
        <Text numberOfLines={1} style={[styles.rowTitle, { color: colors.text }]}>
          {network.ssid ?? HIDDEN_SSID_LABEL}
        </Text>
        <Text numberOfLines={1} style={[styles.caption, { color: colors.muted }]}>
          {details}
        </Text>
        <Text numberOfLines={1} style={[styles.caption, { color: colors.muted }]}>
          {link}
        </Text>
      </View>
      <View style={styles.rowValues}>
        <Text style={[styles.value, { color: colors.text }]}>{network.rssiDbm} dBm</Text>
        <Text style={[styles.value, { color: colors.text }]}>{distance ?? '—'}</Text>
        {distance ? <Text style={[styles.caption, { color: colors.muted }]}>Estimated</Text> : null}
      </View>
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
  scanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  scanButton: {
    flexShrink: 0,
  },
  age: {
    ...typography.caption,
    flexShrink: 1,
  },
  caption: {
    ...typography.caption,
  },
  bandTitle: {
    ...typography.caption,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  emptyText: {
    ...typography.body,
  },
  listBody: {
    gap: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    ...typography.body,
    fontFamily: 'Inter_600SemiBold',
  },
  rowValues: {
    alignItems: 'flex-end',
    gap: 2,
  },
  value: {
    ...typography.mono,
  },
});
