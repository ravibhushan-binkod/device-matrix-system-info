import { useState } from 'react';
import { Alert, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { formatByteSize } from '@/core/utils/format-bytes';
import {
  AdSlot,
  Button,
  Card,
  Chip,
  CopyableText,
  InfoSheet,
  PermissionBanner,
  Screen,
  SectionHeader,
  Skeleton,
  StatRow,
} from '@/design-system/components';
import { withAlpha } from '@/design-system/color';
import { useTheme } from '@/design-system/theme';
import { spacing, typography } from '@/design-system/tokens';
import { StorageBar } from '@/design-system/visuals';
import { useStorage } from '@/features/storage/hooks/use-storage';
import { buildVolumeRows, toStorageOverview } from '@/features/storage/services/storage-service';

const NOT_AVAILABLE = 'Not available on this device';

const STORAGE_SHEET = {
  title: 'Storage: what this means',
  paragraphs: [
    'The bar uses Android\'s own numbers: used = total − free. With Usage Access granted, "apps" is the sum Android reports for every installed app, and "other" is everything left — system files, media, and data Android does not attribute to an app.',
    'Media sizes need photo and video access, which Device Matrix does not ask for, so media is counted inside "other".',
    'The file-system type (f2fs, ext4, erofs…) is read from the kernel mount table when the device allows it.',
    "Clearing the cache only ever touches this app's own cache folder — never other apps' data.",
  ],
};

/** Storage: usage bar, volumes with their file system, and the app-cache tools. */
export function StorageScreen() {
  const { colors } = useTheme();
  const {
    info,
    cacheSize,
    clearing,
    clearCache,
    notice,
    openSettings,
    refreshing,
    refresh,
    usageAccess,
    breakdown,
    breakdownLoading,
  } = useStorage();
  const [sheetVisible, setSheetVisible] = useState(false);

  const overview =
    info == null ? null : info.status === 'ok' ? toStorageOverview(info.value) : info;
  const volumes = info?.status === 'ok' ? buildVolumeRows(info.value) : [];

  const usedSummary =
    overview?.status === 'ok'
      ? `${Math.round(overview.value.percent)}% used · ${formatByteSize(
          overview.value.totalBytes - overview.value.usedBytes,
        )} free${overview.value.fsType ? ` · ${overview.value.fsType}` : ''}`
      : null;
  const internalCopy =
    overview?.status === 'ok'
      ? [
          usedSummary,
          breakdown == null ? null : `Apps: ${formatByteSize(breakdown.appsBytes)}`,
          breakdown == null ? null : `Other: ${formatByteSize(breakdown.otherBytes)}`,
        ]
          .filter((line): line is string => line != null)
          .join('\n')
      : undefined;
  const volumesCopy =
    volumes.length > 0
      ? volumes.map((volume) => `${volume.label}: ${volume.value ?? NOT_AVAILABLE}`).join('\n')
      : undefined;
  const cacheValue =
    cacheSize == null ? null : cacheSize.status === 'ok' ? formatByteSize(cacheSize.value) : null;

  const confirmClear = () => {
    const size = cacheSize?.status === 'ok' ? formatByteSize(cacheSize.value) : null;
    Alert.alert(
      'Clear app cache',
      `${size ? `Removes ${size} of cached files. ` : 'Removes cached files. '}Only this app's cache is touched — your data and settings stay untouched.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: clearCache },
      ],
    );
  };

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
      {overview === null ? (
        <StorageSkeleton />
      ) : (
        <>
          <View style={styles.group}>
            <SectionHeader
              title="Internal storage"
              copyText={internalCopy}
              onInfo={() => setSheetVisible(true)}
            />
            <Card>
              <View style={styles.cardBody}>
                {overview.status === 'ok' ? (
                  <>
                    <StorageBar
                      segments={
                        breakdown != null
                          ? [
                              {
                                key: 'apps',
                                label: 'Apps',
                                value: breakdown.appsBytes,
                                color: colors.accent,
                                valueLabel: formatByteSize(breakdown.appsBytes),
                              },
                              {
                                key: 'other',
                                label: 'Other',
                                value: breakdown.otherBytes,
                                color: withAlpha(colors.accent, 0.4),
                                valueLabel: formatByteSize(breakdown.otherBytes),
                              },
                            ]
                          : [
                              {
                                key: 'used',
                                label: 'Used',
                                value: overview.value.usedBytes,
                                color: colors.accent,
                                valueLabel: formatByteSize(overview.value.usedBytes),
                              },
                            ]
                      }
                      total={overview.value.totalBytes}
                    />
                    <CopyableText
                      value={usedSummary}
                      copyLabel="Internal storage"
                      style={[styles.caption, { color: colors.muted }]}
                    >
                      {usedSummary}
                    </CopyableText>
                    {breakdownLoading && breakdown == null ? (
                      <Text style={[styles.caption, { color: colors.muted }]}>
                        Reading app sizes…
                      </Text>
                    ) : null}
                  </>
                ) : (
                  <Text style={[styles.unavailableTitle, { color: colors.text }]}>
                    {overview.status === 'unavailable' ? NOT_AVAILABLE : 'Permission needed.'}
                  </Text>
                )}
              </View>
            </Card>
            {overview.status === 'ok' && usageAccess === false ? (
              <PermissionBanner
                title="See the apps / other / free split"
                message="Usage access lets Android report how much space each app uses. Media sizes are not included — Device Matrix does not ask for photo or video access."
                actionLabel="Grant usage access"
                onAction={() => openSettings('usage-access')}
              />
            ) : null}
          </View>

          <AdSlot placement="storage-top" />

          <View style={styles.group}>
            <SectionHeader
              title="Volumes"
              copyText={volumesCopy}
              onInfo={() => setSheetVisible(true)}
            />
            <Card>
              <View style={styles.cardBody}>
                {volumes.length > 0 ? (
                  volumes.map((volume) => (
                    <View key={volume.key} style={styles.volumeRow}>
                      <View style={styles.volumeLabels}>
                        <Text
                          numberOfLines={1}
                          style={[styles.volumeLabel, { color: colors.text }]}
                        >
                          {volume.label}
                        </Text>
                        <CopyableText
                          value={volume.value}
                          copyLabel={volume.label}
                          numberOfLines={1}
                          style={[styles.caption, { color: colors.muted }]}
                        >
                          {volume.value ?? NOT_AVAILABLE}
                        </CopyableText>
                      </View>
                      {volume.removable ? <Chip label="Removable" /> : null}
                    </View>
                  ))
                ) : (
                  <Text style={[styles.unavailableTitle, { color: colors.text }]}>
                    {NOT_AVAILABLE}
                  </Text>
                )}
              </View>
            </Card>
          </View>

          <View style={styles.group}>
            <SectionHeader
              title="Tools"
              copyText={cacheValue == null ? undefined : `This app's cache: ${cacheValue}`}
              onInfo={() => setSheetVisible(true)}
            />
            <Card>
              <View style={styles.cardBody}>
                <StatRow label="This app's cache" value={cacheValue ?? NOT_AVAILABLE} />
                <View style={styles.actions}>
                  <Button
                    title="Clear app cache"
                    icon="storage"
                    variant="secondary"
                    disabled={clearing}
                    onPress={confirmClear}
                  />
                  <Button
                    title="Open storage settings"
                    icon="settings"
                    variant="secondary"
                    onPress={() => openSettings('storage')}
                  />
                  <Button
                    title="Free up space (system)"
                    icon="storage"
                    variant="secondary"
                    onPress={() => openSettings('storage-manager')}
                  />
                </View>
                {notice ? (
                  <Text style={[styles.caption, { color: colors.muted }]}>{notice}</Text>
                ) : null}
              </View>
            </Card>
          </View>
        </>
      )}

      <InfoSheet
        visible={sheetVisible}
        title={STORAGE_SHEET.title}
        paragraphs={[...STORAGE_SHEET.paragraphs]}
        onClose={() => setSheetVisible(false)}
      />
    </Screen>
  );
}

function StorageSkeleton() {
  return (
    <View style={styles.content}>
      <Card>
        <View style={styles.cardBody}>
          <Skeleton width="40%" height={14} />
          <Skeleton height={24} />
          <Skeleton width="60%" height={14} />
        </View>
      </Card>
      <Card>
        <View style={styles.cardBody}>
          {[0, 1].map((row) => (
            <Skeleton key={row} height={16} />
          ))}
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  group: {
    gap: spacing.sm,
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
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  volumeLabels: {
    flex: 1,
    gap: spacing.xs,
  },
  volumeLabel: {
    ...typography.body,
  },
  actions: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
});
