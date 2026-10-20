import { useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';

import {
  AdSlot,
  Card,
  Chip,
  EmptyState,
  InfoSheet,
  Screen,
  SectionHeader,
  Skeleton,
  StatRow,
} from '@/design-system/components';
import { useTheme } from '@/design-system/theme';
import { spacing, typography } from '@/design-system/tokens';
import { LiveGraph, MemoryDonut } from '@/design-system/visuals';
import { formatByteSize } from '@/core/utils/format-bytes';
import { useMemory } from '@/features/memory/hooks/use-memory';

const NOT_AVAILABLE = 'Not available on this device';

const MEMORY_SHEET = {
  title: 'RAM: what this means',
  paragraphs: [
    '"Used" is the total minus Android’s "available" figure. Android deliberately keeps RAM busy with caches — a high used number is normal, not a problem.',
    'Swap is extra space that lives on flash (usually compressed, called zram) and is used when RAM runs low. It comes from /proc/meminfo; when the kernel hides it, Device Matrix says so instead of guessing.',
    'Android does not expose the RAM type (for example LPDDR4X or LPDDR5) or its speed to apps, so Device Matrix shows "Not available on this device" and never estimates them.',
    'The live graph tracks available RAM, one point every three seconds while the screen is open; the pause chip freezes it.',
  ],
};

/** Memory: usage donut, ActivityManager stats, swap and a pausable live graph. */
export function MemoryScreen() {
  const { colors } = useTheme();
  const { stats, samples, paused, togglePause, isPolling, refreshing, refresh } = useMemory();
  const [sheetVisible, setSheetVisible] = useState(false);

  const latest = samples.length > 0 ? samples[samples.length - 1] : null;

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
      {stats === null ? (
        <MemorySkeleton />
      ) : stats.status === 'ok' ? (
        <>
          <View style={styles.group}>
            <SectionHeader title="Memory" onInfo={() => setSheetVisible(true)} />
            <Card>
              <View style={styles.donutBody}>
                <MemoryDonut
                  value={stats.value.usedPercent}
                  label="used"
                  accessibilityLabel="Memory used"
                />
                <Text style={[styles.caption, { color: colors.muted }]}>
                  {formatByteSize(stats.value.availableBytes)} available
                </Text>
              </View>
            </Card>
          </View>

          <AdSlot placement="memory-mid" />

          <View style={styles.group}>
            <SectionHeader title="Details" onInfo={() => setSheetVisible(true)} />
            <Card>
              <View style={styles.cardBody}>
                <StatRow label="Total" value={formatByteSize(stats.value.totalBytes)} />
                <StatRow label="Available" value={formatByteSize(stats.value.availableBytes)} />
                <StatRow label="Used" value={formatByteSize(stats.value.usedBytes)} />
                <StatRow label="Threshold" value={formatByteSize(stats.value.thresholdBytes)} />
                <StatRow
                  label="Low memory"
                  value={stats.value.lowMemory ? 'Yes' : 'No'}
                  copyable={false}
                />
                {stats.value.swapTotalBytes != null ? (
                  <StatRow label="Swap total" value={formatByteSize(stats.value.swapTotalBytes)} />
                ) : null}
                {stats.value.swapUsedBytes != null ? (
                  <StatRow label="Swap used" value={formatByteSize(stats.value.swapUsedBytes)} />
                ) : null}
                <StatRow label="RAM type & speed" value={NOT_AVAILABLE} copyable={false} />
                <Text style={[styles.caption, { color: colors.muted }]}>
                  Android does not report RAM type or speed to apps.
                </Text>
              </View>
            </Card>
          </View>

          <View style={styles.group}>
            <SectionHeader
              title="Available RAM"
              action={
                <Chip
                  label={paused ? 'Resume' : 'Pause'}
                  icon={paused ? 'play' : 'pause'}
                  onPress={togglePause}
                />
              }
              onInfo={() => setSheetVisible(true)}
            />
            <Card>
              <View style={styles.cardBody}>
                <View style={styles.graphValueRow}>
                  <Text style={[styles.graphValue, { color: colors.text }]}>
                    {latest == null ? NOT_AVAILABLE : formatByteSize(latest * 1_000_000)}
                  </Text>
                  <Text style={[styles.caption, { color: colors.muted }]}>
                    {paused ? 'Paused' : isPolling ? 'Live · updates every 3 s' : 'Paused'}
                  </Text>
                </View>
                <LiveGraph
                  data={samples}
                  paused={paused || !isPolling}
                  accessibilityLabel="Available RAM graph, megabytes"
                />
              </View>
            </Card>
          </View>
        </>
      ) : (
        <EmptyState
          icon="memory"
          title="Memory"
          message={
            stats.status === 'unavailable' ? stats.reason : `Permission needed: ${stats.permission}`
          }
        />
      )}

      <InfoSheet
        visible={sheetVisible}
        title={MEMORY_SHEET.title}
        paragraphs={[...MEMORY_SHEET.paragraphs]}
        onClose={() => setSheetVisible(false)}
      />
    </Screen>
  );
}

function MemorySkeleton() {
  return (
    <View style={styles.content}>
      <Card>
        <View style={styles.donutBody}>
          <Skeleton width={168} height={168} round />
        </View>
      </Card>
      <Card>
        <View style={styles.cardBody}>
          {[0, 1, 2, 3].map((row) => (
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
  donutBody: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardBody: {
    gap: spacing.sm,
  },
  graphValueRow: {
    gap: spacing.xs,
  },
  graphValue: {
    ...typography.title,
    fontVariant: ['tabular-nums'],
  },
  caption: {
    ...typography.caption,
  },
});
