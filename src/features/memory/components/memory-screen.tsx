import { RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Card, Chip, EmptyState, Screen, Skeleton, StatRow } from '@/design-system/components';
import { useTheme } from '@/design-system/theme';
import { spacing, typography } from '@/design-system/tokens';
import { LiveGraph, MemoryDonut } from '@/design-system/visuals';
import { formatByteSize } from '@/core/utils/format-bytes';
import { useMemory } from '@/features/memory/hooks/use-memory';

const NOT_AVAILABLE = 'Not available on this device';

/** Memory: usage donut, ActivityManager stats and a pausable live graph. */
export function MemoryScreen() {
  const { colors } = useTheme();
  const { stats, samples, paused, togglePause, isPolling, refreshing, refresh } = useMemory();

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
          <Card>
            <View style={styles.donutBody}>
              <MemoryDonut value={stats.value.usedPercent} label="used" accessibilityLabel="Memory used" />
              <Text style={[styles.caption, { color: colors.muted }]}>
                {formatByteSize(stats.value.availableBytes)} available
              </Text>
            </View>
          </Card>

          <Card>
            <View style={styles.cardBody}>
              <StatRow label="Total" value={formatByteSize(stats.value.totalBytes)} />
              <StatRow label="Available" value={formatByteSize(stats.value.availableBytes)} />
              <StatRow label="Threshold" value={formatByteSize(stats.value.thresholdBytes)} />
              <StatRow
                label="Low memory"
                value={stats.value.lowMemory ? 'Yes' : 'No'}
                copyable={false}
              />
            </View>
          </Card>

          <Card>
            <View style={styles.cardBody}>
              <View style={styles.cardHead}>
                <Text style={[styles.sectionTitle, { color: colors.muted }]}>Available RAM</Text>
                <Chip
                  label={paused ? 'Resume' : 'Pause'}
                  icon={paused ? 'play' : 'pause'}
                  onPress={togglePause}
                />
              </View>
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
  donutBody: {
    alignItems: 'center',
    gap: spacing.sm,
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
