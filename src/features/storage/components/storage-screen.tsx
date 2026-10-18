import { Alert, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { formatByteSize } from '@/core/utils/format-bytes';
import { AdSlot, Button, Card, Chip, Screen, Skeleton, StatRow } from '@/design-system/components';
import { useTheme } from '@/design-system/theme';
import { spacing, typography } from '@/design-system/tokens';
import { StorageBar } from '@/design-system/visuals';
import { useStorage } from '@/features/storage/hooks/use-storage';
import { buildVolumeRows, toStorageOverview } from '@/features/storage/services/storage-service';

const NOT_AVAILABLE = 'Not available on this device';

/** Storage: usage bar, volume rows and the app-cache tools. */
export function StorageScreen() {
  const { colors } = useTheme();
  const { info, cacheSize, clearing, clearCache, notice, openSettings, refreshing, refresh } =
    useStorage();

  const overview =
    info == null ? null : info.status === 'ok' ? toStorageOverview(info.value) : info;
  const volumes = info?.status === 'ok' ? buildVolumeRows(info.value) : [];

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
          <Card>
            <View style={styles.cardBody}>
              <Text style={[styles.sectionTitle, { color: colors.muted }]}>Internal storage</Text>
              {overview.status === 'ok' ? (
                <>
                  <StorageBar
                    segments={[
                      {
                        key: 'used',
                        label: 'Used',
                        value: overview.value.usedBytes,
                        color: colors.accent,
                        valueLabel: formatByteSize(overview.value.usedBytes),
                      },
                    ]}
                    total={overview.value.totalBytes}
                  />
                  <Text style={[styles.caption, { color: colors.muted }]}>
                    {Math.round(overview.value.percent)}% used ·{' '}
                    {formatByteSize(overview.value.totalBytes - overview.value.usedBytes)} free
                  </Text>
                </>
              ) : (
                <Text style={[styles.unavailableTitle, { color: colors.text }]}>
                  {overview.status === 'unavailable' ? NOT_AVAILABLE : 'Permission needed.'}
                </Text>
              )}
            </View>
          </Card>

          <AdSlot />

          <Card>
            <View style={styles.cardBody}>
              <Text style={[styles.sectionTitle, { color: colors.muted }]}>Volumes</Text>
              {volumes.length > 0 ? (
                volumes.map((volume) => (
                  <View key={volume.key} style={styles.volumeRow}>
                    <View style={styles.volumeLabels}>
                      <Text numberOfLines={1} style={[styles.volumeLabel, { color: colors.text }]}>
                        {volume.label}
                      </Text>
                      <Text numberOfLines={1} style={[styles.caption, { color: colors.muted }]}>
                        {volume.value ?? NOT_AVAILABLE}
                      </Text>
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

          <Card>
            <View style={styles.cardBody}>
              <Text style={[styles.sectionTitle, { color: colors.muted }]}>Tools</Text>
              <StatRow
                label="This app's cache"
                value={
                  cacheSize == null
                    ? NOT_AVAILABLE
                    : cacheSize.status === 'ok'
                      ? formatByteSize(cacheSize.value)
                      : NOT_AVAILABLE
                }
                copyable={false}
              />
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
        </>
      )}
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
  cardBody: {
    gap: spacing.sm,
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
