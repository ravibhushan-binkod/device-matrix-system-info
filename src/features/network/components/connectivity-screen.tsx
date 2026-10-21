import { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { openAppSettings } from '@/core/permissions';
import { PressableScale } from '@/design-system/animations/pressable-scale';
import {
  Card,
  CopyableText,
  EmptyState,
  InfoSheet,
  OpenSettingsDialog,
  PermissionBanner,
  PermissionRationaleSheet,
  Screen,
  SectionHeader,
  Skeleton,
  StatRow,
} from '@/design-system/components';
import { copyValue } from '@/design-system/copy/copy-value';
import { Icon } from '@/design-system/icon';
import { useTheme } from '@/design-system/theme';
import { radius, spacing, typography } from '@/design-system/tokens';
import { useConnectivity } from '@/features/network/hooks/use-connectivity';
import {
  buildCapabilityGroups,
  capabilityLabel,
  countSystemFeatures,
  filterSystemFeatures,
  groupSystemFeatures,
} from '@/features/network/services/connectivity-service';
import { onOffLabel } from '@/features/network/services/network-service';

const NOT_AVAILABLE = 'Not available on this device';

type SheetId = 'radios' | 'wifi' | 'wired' | 'telephony' | 'features';

const SHEETS: Record<SheetId, { title: string; paragraphs: string[] }> = {
  radios: {
    title: 'Radios: what this means',
    paragraphs: [
      '"Supported" comes from the features Android publishes for this device; "Not reported" means Android gave no answer. The app never guesses.',
      'Bluetooth version numbers (4.2, 5.0, 5.2 …) are not published by Android, so the LE rows below show exactly what the radio supports instead.',
      'Host card emulation (HCE) lets an app act like a smart card. The row only reports whether the device offers it — this app never touches payment cards.',
    ],
  },
  wifi: {
    title: 'Wi-Fi capabilities: what this means',
    paragraphs: [
      'The band and standard rows come from the Wi-Fi chipset through Android’s public API, so they describe what the hardware can do, not what your current network uses.',
      'Wi-Fi 6E means the 6 GHz band; Wi-Fi 7 adds 320 MHz channels. "Not reported" rows mean the OS did not expose the capability.',
      'Wi-Fi Direct, Aware and RTT are separate radio features the chipset may or may not support.',
    ],
  },
  wired: {
    title: 'Wired & positioning: what this means',
    paragraphs: [
      'USB host means the phone can drive USB devices (sticks, drives, controllers); USB accessory means it can act as a device for another host.',
      'GPS and network location rows come from Android’s feature list and need no location permission — no position is ever read here.',
      'Infrared is the old TV-remote style IR blaster; many newer phones no longer include one.',
    ],
  },
  telephony: {
    title: 'Telephony: what this means',
    paragraphs: [
      'These rows come from Android’s feature list and describe the modem: calls, mobile data, messaging, eSIM and IMS (VoLTE / Wi-Fi calling).',
      'A phone can lack features with no SIM inserted — this shows hardware capability, not your plan.',
    ],
  },
  features: {
    title: 'System features: what this means',
    paragraphs: [
      'This is the raw list Android reports for this device through PackageManager — the same data the sections above summarize, plus vendor features.',
      'Rows are grouped by prefix, e.g. android.hardware.wifi. Tap a row to copy the feature name.',
    ],
  },
};

/** Connectivity: radio capabilities and every system feature Android reports. */
export function ConnectivityScreen() {
  const { colors } = useTheme();
  const { capabilities, bluetooth, nfc, bluetoothPermission, refresh } = useConnectivity();

  const [query, setQuery] = useState('');
  const [sheet, setSheet] = useState<SheetId | null>(null);
  const [btSheet, setBtSheet] = useState(false);
  const [settingsDialog, setSettingsDialog] = useState(false);

  const groups = useMemo(() => {
    if (capabilities?.status !== 'ok') return null;
    return buildCapabilityGroups({ capabilities: capabilities.value });
  }, [capabilities]);

  const featureGroups = useMemo(() => {
    if (capabilities?.status !== 'ok') return [];
    return groupSystemFeatures(capabilities.value.systemFeatures);
  }, [capabilities]);

  const filteredFeatures = useMemo(
    () => filterSystemFeatures(featureGroups, query),
    [featureGroups, query],
  );
  const totalFeatures = countSystemFeatures(featureGroups);
  const shownFeatures = countSystemFeatures(filteredFeatures);

  const bt = bluetooth?.status === 'ok' ? bluetooth.value : null;
  const nfcValue = nfc?.status === 'ok' ? nfc.value : null;
  const showBluetoothBanner =
    !bluetoothPermission.granted &&
    bluetoothPermission.state !== 'checking' &&
    bluetooth?.status !== 'unavailable';

  const askBluetooth = () => {
    if (bluetoothPermission.canAskAgain) setBtSheet(true);
    else setSettingsDialog(true);
  };

  const allowBluetooth = async () => {
    setBtSheet(false);
    const next = await bluetoothPermission.request();
    if (next === 'granted') refresh();
    else if (next === 'blocked') setSettingsDialog(true);
  };

  const radiosRows =
    groups
      ?.find((group) => group.id === 'radios')
      ?.rows.filter((row) => row.id !== 'bluetooth' && row.id !== 'nfc') ?? [];

  const rowsCopy = (groupId: string): string | undefined => {
    const rows = groups?.find((group) => group.id === groupId)?.rows ?? [];
    return rows.length > 0
      ? rows.map((row) => `${row.label}: ${capabilityLabel(row.supported)}`).join('\n')
      : undefined;
  };
  const radiosCopy = [
    `Bluetooth: ${bt ? (onOffLabel(bt.enabled) ?? NOT_AVAILABLE) : NOT_AVAILABLE}`,
    `NFC: ${nfcValue ? (onOffLabel(nfcValue.enabled) ?? NOT_AVAILABLE) : NOT_AVAILABLE}`,
    ...radiosRows.map((row) => `${row.label}: ${capabilityLabel(row.supported)}`),
  ].join('\n');
  const featuresCopy =
    filteredFeatures.length > 0
      ? filteredFeatures.flatMap((group) => group.features).join('\n')
      : undefined;

  return (
    <Screen scroll contentStyle={styles.content}>
      {capabilities === null ? (
        <ConnectivitySkeleton />
      ) : capabilities.status !== 'ok' ? (
        <EmptyState
          icon="signal"
          title="Connectivity"
          message={
            capabilities.status === 'unavailable'
              ? capabilities.reason
              : `Permission needed: ${capabilities.permission}`
          }
        />
      ) : (
        <>
          <SectionHeader title="Radios" copyText={radiosCopy} onInfo={() => setSheet('radios')} />
          <Card>
            <View style={styles.cardBody}>
              {showBluetoothBanner ? (
                <PermissionBanner
                  icon="bluetooth"
                  title="See the Bluetooth state"
                  message="Android 12 and newer need the Nearby devices permission to read it."
                  actionLabel={bluetoothPermission.canAskAgain ? 'Allow' : 'Open settings'}
                  onAction={askBluetooth}
                />
              ) : (
                <StatRow
                  label="Bluetooth"
                  value={bt ? (onOffLabel(bt.enabled) ?? NOT_AVAILABLE) : NOT_AVAILABLE}
                />
              )}
              <StatRow
                label="NFC"
                value={nfcValue ? (onOffLabel(nfcValue.enabled) ?? NOT_AVAILABLE) : NOT_AVAILABLE}
              />
              {radiosRows.map((row) => (
                <StatRow key={row.id} label={row.label} value={capabilityLabel(row.supported)} />
              ))}
            </View>
          </Card>

          <SectionHeader
            title="Wi-Fi capabilities"
            copyText={rowsCopy('wifi')}
            onInfo={() => setSheet('wifi')}
          />
          <Card>
            <View style={styles.cardBody}>
              {(groups?.find((group) => group.id === 'wifi')?.rows ?? []).map((row) => (
                <StatRow key={row.id} label={row.label} value={capabilityLabel(row.supported)} />
              ))}
            </View>
          </Card>

          <SectionHeader
            title="Wired & positioning"
            copyText={rowsCopy('wired')}
            onInfo={() => setSheet('wired')}
          />
          <Card>
            <View style={styles.cardBody}>
              {(groups?.find((group) => group.id === 'wired')?.rows ?? []).map((row) => (
                <StatRow key={row.id} label={row.label} value={capabilityLabel(row.supported)} />
              ))}
            </View>
          </Card>

          <SectionHeader
            title="Telephony"
            copyText={rowsCopy('telephony')}
            onInfo={() => setSheet('telephony')}
          />
          <Card>
            <View style={styles.cardBody}>
              {(groups?.find((group) => group.id === 'telephony')?.rows ?? []).map((row) => (
                <StatRow key={row.id} label={row.label} value={capabilityLabel(row.supported)} />
              ))}
            </View>
          </Card>

          <SectionHeader
            title="System features"
            copyText={featuresCopy}
            onInfo={() => setSheet('features')}
          />
          <SearchField value={query} onChangeText={setQuery} />
          <CopyableText
            value={featuresCopy}
            copyLabel="System features"
            style={[styles.count, { color: colors.muted }]}
          >
            {shownFeatures === totalFeatures
              ? `${totalFeatures} features`
              : `${shownFeatures} of ${totalFeatures} features`}
          </CopyableText>
          {filteredFeatures.length === 0 ? (
            <Card>
              <Text style={[styles.emptyText, { color: colors.muted }]}>
                No features match &ldquo;{query.trim()}&rdquo;.
              </Text>
            </Card>
          ) : (
            filteredFeatures.map((group) => (
              <Card key={group.id}>
                <View style={styles.cardBody}>
                  <Text style={[styles.groupTitle, { color: colors.muted }]}>{group.id}</Text>
                  {group.features.map((feature, index) => (
                    <FeatureRow key={feature} feature={feature} divided={index > 0} />
                  ))}
                </View>
              </Card>
            ))
          )}
        </>
      )}

      <InfoSheet
        visible={sheet === 'radios'}
        title={SHEETS.radios.title}
        paragraphs={SHEETS.radios.paragraphs}
        onClose={() => setSheet(null)}
      />
      <InfoSheet
        visible={sheet === 'wifi'}
        title={SHEETS.wifi.title}
        paragraphs={SHEETS.wifi.paragraphs}
        onClose={() => setSheet(null)}
      />
      <InfoSheet
        visible={sheet === 'wired'}
        title={SHEETS.wired.title}
        paragraphs={SHEETS.wired.paragraphs}
        onClose={() => setSheet(null)}
      />
      <InfoSheet
        visible={sheet === 'telephony'}
        title={SHEETS.telephony.title}
        paragraphs={SHEETS.telephony.paragraphs}
        onClose={() => setSheet(null)}
      />
      <InfoSheet
        visible={sheet === 'features'}
        title={SHEETS.features.title}
        paragraphs={SHEETS.features.paragraphs}
        onClose={() => setSheet(null)}
      />

      <PermissionRationaleSheet
        visible={btSheet}
        title="See the Bluetooth state"
        message='Android 12 and newer require the "Nearby devices" permission to read whether Bluetooth is on.'
        footer="The app never scans for, connects to or changes any Bluetooth device."
        onAllow={() => void allowBluetooth()}
        onCancel={() => setBtSheet(false)}
      />
      <OpenSettingsDialog
        visible={settingsDialog}
        message={
          'The Nearby devices permission is set to "don\'t ask again". Open this app\'s settings to allow it.'
        }
        onOpen={() => {
          setSettingsDialog(false);
          openAppSettings();
        }}
        onCancel={() => setSettingsDialog(false)}
      />
    </Screen>
  );
}

function SearchField({
  value,
  onChangeText,
}: {
  value: string;
  onChangeText: (text: string) => void;
}) {
  const { colors } = useTheme();

  return (
    <View style={[styles.search, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
      <Icon name="search" size={20} color={colors.muted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Search features"
        placeholderTextColor={colors.muted}
        style={[styles.searchInput, { color: colors.text }]}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
      />
      {value.length > 0 ? (
        <PressableScale
          onPress={() => onChangeText('')}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          hitSlop={14}
        >
          <Icon name="x" size={20} color={colors.muted} />
        </PressableScale>
      ) : null}
    </View>
  );
}

/** One system feature; tapping copies the name with the app-wide feedback. */
function FeatureRow({ feature, divided }: { feature: string; divided: boolean }) {
  const { colors } = useTheme();

  return (
    <PressableScale
      onPress={() => void copyValue(feature, 'System feature')}
      accessibilityRole="button"
      accessibilityLabel={`Copy ${feature}`}
      style={[
        styles.featureRow,
        divided
          ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }
          : null,
      ]}
    >
      <Text style={[styles.featureName, { color: colors.text }]}>{feature}</Text>
      <Icon name="copy" size={16} color={colors.muted} />
    </PressableScale>
  );
}

function ConnectivitySkeleton() {
  return (
    <View style={styles.content}>
      {[0, 1].map((card) => (
        <Card key={card}>
          <View style={styles.cardBody}>
            <Skeleton width="40%" height={14} />
            {[0, 1, 2, 3].map((row) => (
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
  groupTitle: {
    ...typography.caption,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 48,
    paddingHorizontal: spacing.md,
    borderRadius: radius.button,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchInput: {
    flex: 1,
    alignSelf: 'stretch',
    textAlignVertical: 'center',
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    padding: 0,
  },
  count: {
    ...typography.caption,
  },
  emptyText: {
    ...typography.body,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 48,
    paddingVertical: spacing.sm,
  },
  featureName: {
    ...typography.mono,
    flex: 1,
  },
});
