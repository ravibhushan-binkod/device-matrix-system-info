import { Fragment, useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';

import {
  AdSlot,
  DeviceBrandLogo,
  Button,
  Card,
  CopyableText,
  InfoSheet,
  Screen,
  SectionHeader,
  Skeleton,
  StatRow,
} from '@/design-system/components';
import { copyValue } from '@/design-system/copy/copy-value';
import { MASKED_VALUE } from '@/design-system/privacy/sensitive-value';
import { useTheme } from '@/design-system/theme';
import { spacing, typography } from '@/design-system/tokens';
import { useSettingsStore } from '@/state/settings-store';
import { useDevice } from '@/features/device/hooks/use-device';
import { readDeviceInfo } from '@/features/device/services/device-service';
import type { DeviceBranding, DeviceInfoEntry, DeviceInfoSection } from '@/features/device/types';

const NOT_AVAILABLE = 'Not available on this device';

const DEVICE_SHEET = {
  title: 'Device details: what this means',
  paragraphs: [
    '"Estimated age" uses the older of two dates: when the ROM was built (Build.TIME) and when the Android version the phone launched with was first released. Manufacturers often build a ROM months before the phone ships, so treat it as a rough lower bound — the hardware itself can be older.',
    '"First API level" is the Android version the phone shipped with, and it never changes. Release names were only public up to Android 9 (Pie); newer versions only report the number.',
    '"Play services" is the version of the Google Play services package installed on the phone. "SELinux" is the kernel\'s security mode — Enforcing is the secure default.',
    'Every value here comes from public Android and Linux interfaces. Whatever the phone hides shows as "Not available on this device".',
  ],
};

/** Device & OS: identity, Android build facts, system details and the boot chain. */
export function DeviceScreen() {
  const { colors } = useTheme();
  const { info, refreshing, refresh } = useDevice();
  const hideSensitiveValues = useSettingsStore((state) => state.hideSensitiveValues);
  const [sheetVisible, setSheetVisible] = useState(false);

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
      {info ? (
        <>
          <BrandHeader branding={info.branding} />
          {info.sections.map((section, index) => (
            <Fragment key={section.key}>
              {index === 2 ? <AdSlot placement="device-sections" /> : null}
              <SectionCard
                section={section}
                hideSensitive={hideSensitiveValues}
                onInfo={() => setSheetVisible(true)}
              />
            </Fragment>
          ))}
          <CopyAllButton includeIdentifying={!hideSensitiveValues} />
          {hideSensitiveValues ? (
            <Text style={[styles.note, { color: colors.muted }]}>
              “Hide sensitive values” is on, so the fingerprint is replaced in the copied text.
              Turning it off in Settings → Privacy includes it again.
            </Text>
          ) : null}
        </>
      ) : (
        <DeviceSkeleton />
      )}

      <InfoSheet
        visible={sheetVisible}
        title={DEVICE_SHEET.title}
        paragraphs={[...DEVICE_SHEET.paragraphs]}
        onClose={() => setSheetVisible(false)}
      />
    </Screen>
  );
}

function sectionCopyText(section: DeviceInfoSection, hideSensitive: boolean): string {
  return section.entries
    .map((entry) => {
      const value =
        hideSensitive && entry.sensitive && entry.value != null
          ? MASKED_VALUE
          : (entry.value ?? NOT_AVAILABLE);
      return `${entry.label}: ${value}`;
    })
    .join('\n');
}

/**
 * The Device/OS header: the phone maker's mark and the OS mark, both drawn
 * from what Android reported. Renders nothing on a device that reports no
 * identifiable maker instead of guessing.
 */
function BrandHeader({ branding }: { branding: DeviceBranding }) {
  const { colors } = useTheme();
  if (branding.phone == null && branding.platform == null) return null;

  return (
    <Card>
      <View style={styles.brandRow}>
        {branding.phone ? (
          <View style={styles.brandItem}>
            <DeviceBrandLogo mark={branding.phone} size={30} color={colors.accent} />
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={1.3}
              style={[styles.brandName, { color: colors.text }]}
            >
              {branding.phone.name}
            </Text>
          </View>
        ) : null}
        {branding.platform ? (
          <View style={styles.brandItem}>
            <DeviceBrandLogo mark={branding.platform} size={22} color={colors.accent} />
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={1.3}
              style={[styles.brandName, { color: colors.muted }]}
            >
              {branding.platform.name}
            </Text>
          </View>
        ) : null}
      </View>
    </Card>
  );
}

function SectionCard({
  section,
  hideSensitive,
  onInfo,
}: {
  section: DeviceInfoSection;
  hideSensitive: boolean;
  onInfo: () => void;
}) {
  return (
    <View style={styles.group}>
      <SectionHeader
        title={section.title}
        copyText={sectionCopyText(section, hideSensitive)}
        onInfo={onInfo}
      />
      <Card>
        <View style={styles.cardBody}>
          {section.entries.map((entry) =>
            entry.multiline ? (
              <BlockRow key={entry.key} entry={entry} />
            ) : (
              <StatRow
                key={entry.key}
                label={entry.label}
                value={entry.value ?? NOT_AVAILABLE}
                copyable={entry.value != null}
                sensitive={entry.sensitive === true}
              />
            ),
          )}
        </View>
      </Card>
    </View>
  );
}

function BlockRow({ entry }: { entry: DeviceInfoEntry }) {
  const { colors } = useTheme();

  return (
    <View style={styles.block}>
      <Text style={[styles.blockLabel, { color: colors.muted }]}>{entry.label}</Text>
      <CopyableText
        value={entry.value}
        copyLabel={entry.label}
        sensitive={entry.sensitive === true}
        style={[styles.blockValue, { color: entry.value ? colors.text : colors.muted }]}
      >
        {entry.value ?? NOT_AVAILABLE}
      </CopyableText>
    </View>
  );
}

/**
 * Reads the sections again at press time so the copied text matches the
 * current "Hide sensitive values" choice: a masked screen never copies the
 * fingerprint.
 */
function CopyAllButton({ includeIdentifying }: { includeIdentifying: boolean }) {
  return (
    <Button
      title="Copy all"
      icon="copy"
      onPress={() =>
        void copyValue(readDeviceInfo({ includeIdentifying }).report, 'All device details')
      }
    />
  );
}

function DeviceSkeleton() {
  return (
    <View style={styles.skeletonStack}>
      {[0, 1, 2, 3].map((card) => (
        <Card key={card}>
          <View style={styles.cardBody}>
            <Skeleton width="35%" height={14} />
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
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  brandItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 1,
  },
  brandName: {
    ...typography.body,
    fontFamily: 'Inter_600SemiBold',
    flexShrink: 1,
  },
  group: {
    gap: spacing.sm,
  },
  block: {
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  blockLabel: {
    ...typography.caption,
  },
  blockValue: {
    ...typography.mono,
  },
  note: {
    ...typography.caption,
    paddingHorizontal: spacing.xs,
  },
  skeletonStack: {
    gap: spacing.lg,
  },
});
