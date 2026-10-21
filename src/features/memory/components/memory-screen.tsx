import { useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';

import {
  AdSlot,
  Card,
  Chip,
  CopyableText,
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
  const memoryCopy =
    stats?.status === 'ok'
      ? [
          `Usage: ${Math.round(stats.value.usedPercent)}%`,
          `Used: ${formatByteSize(stats.value.usedBytes)} of ${formatByteSize(stats.value.totalBytes)}`,
          `Available: ${formatByteSize(stats.value.availableBytes)}`,
        ].join('\n')
      : undefined;
  const detailsCopy =
    stats?.status === 'ok'
      ? [
          `Total: ${formatByteSize(stats.value.totalBytes)}`,
          `Available: ${formatByteSize(stats.value.availableBytes)}`,
          `Used: ${formatByteSize(stats.value.usedBytes)}`,
          `Threshold: ${formatByteSize(stats.value.thresholdBytes)}`,
          `Low memory: ${stats.value.lowMemory ? 'Yes' : 'No'}`,
          stats.value.swapTotalBytes == null
            ? null
            : `Swap total: ${formatByteSize(stats.value.swapTotalBytes)}`,
          stats.value.swapUsedBytes == null
            ? null
            : `Swap used: ${formatByteSize(stats.value.swapUsedBytes)}`,
        ]
          .filter((line): line is string => line != null)
          .join('\n')
      : undefined;
  const available = latest == null ? NOT_AVAILABLE : formatByteSize(latest * 1_000_000);

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
            <SectionHeader
              title="Memory"
              copyText={memoryCopy}
              onInfo={() => setSheetVisible(true)}
            />
            <Card>
              <View style={styles.donutBody}>
                <MemoryDonut
                  value={stats.value.usedPercent}
                  label="used"
                  accessibilityLabel="Memory used"
                />
                <CopyableText
                  value={formatByteSize(stats.value.availableBytes)}
                  copyLabel="Available memory"
                  style={[styles.caption, { color: colors.muted }]}
                >
                  {formatByteSize(stats.value.availableBytes)} available
                </CopyableText>
              </View>
            </Card>
          </View>

          <AdSlot placement="memory-mid" />

          <View style={styles.group}>
            <SectionHeader
              title="Details"
              copyText={detailsCopy}
              onInfo={() => setSheetVisible(true)}
            />
            <Card>
              <View style={styles.cardBody}>
                <StatRow label="Total" value={formatByteSize(stats.value.totalBytes)} />
                <StatRow label="Available" value={formatByteSize(stats.value.availableBytes)} />
                <StatRow label="Used" value={formatByteSize(stats.value.usedBytes)} />
                <StatRow label="Threshold" value={formatByteSize(stats.value.thresholdBytes)} />
                <StatRow label="Low memory" value={stats.value.lowMemory ? 'Yes' : 'No'} />
                {stats.value.swapTotalBytes != null ? (
                  <StatRow label="Swap total" value={formatByteSize(stats.value.swapTotalBytes)} />
                ) : null}
                {stats.value.swapUsedBytes != null ? (
                  <StatRow label="Swap used" value={formatByteSize(stats.value.swapUsedBytes)} />
                ) : null}
                <StatRow label="RAM type & speed" value={NOT_AVAILABLE} />
                <Text style={[styles.caption, { color: colors.muted }]}>
                  Android does not report RAM type or speed to apps.
                </Text>
              </View>
            </Card>
          </View>

          <View style={styles.group}>
            <SectionHeader
              title="Available RAM"
              copyText={latest == null ? undefined : `Available: ${available}`}
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
                  <CopyableText
                    value={latest == null ? null : available}
                    copyLabel="Available memory"
                    style={[styles.graphValue, { color: colors.text }]}
                  >
                    {available}
                  </CopyableText>
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
