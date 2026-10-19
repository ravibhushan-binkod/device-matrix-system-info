import { StyleSheet, Text, View } from 'react-native';

import type { AppStorageStats, AppUsageTotal, InstalledApp } from '@/core/native';
import type { Result } from '@/core/result';
import { formatByteSize } from '@/core/utils/format-bytes';
import { formatUptime } from '@/core/utils/format-duration';
import { PressableScale } from '@/design-system/animations/pressable-scale';
import { Card, Chip, PermissionBanner, SectionHeader, Skeleton } from '@/design-system/components';
import { useTheme } from '@/design-system/theme';
import { spacing, typography } from '@/design-system/tokens';
import { AppIcon } from '@/features/apps/components/app-icon';
import type { UsageReading } from '@/features/apps/hooks/use-app-usage';
import {
  USAGE_RANGES,
  mergeStorageRanking,
  mergeUsageRanking,
} from '@/features/apps/services/apps-service';
import type { RankedApp, UsageRange } from '@/features/apps/types';

const RANGE_LABELS: Record<UsageRange, string> = {
  today: 'Today',
  week: '7 days',
};

type Props = {
  granted: boolean | null;
  apps: InstalledApp[];
  usage: UsageReading | null;
  range: UsageRange;
  onRangeChange: (range: UsageRange) => void;
  storage: Result<AppStorageStats[]> | null;
  onScanStorage: () => void;
  onOpenSettings: () => void;
  notice: string | null;
};

/**
 * The Usage Access flow plus, once granted, the screen-time and app-size
 * rankings. Without the grant only these two readings stay hidden — the
 * banner names the exact system screen that hands the access over.
 */
export function UsagePanel({
  granted,
  apps,
  usage,
  range,
  onRangeChange,
  storage,
  onScanStorage,
  onOpenSettings,
  notice,
}: Props) {
  const { colors } = useTheme();

  return (
    <View style={styles.stack}>
      {granted === false ? (
        <PermissionBanner
          title="Usage Access is off"
          message="Android keeps screen time and app sizes private until you allow Usage Access. The app list and every detail keep working either way."
          icon="apps"
          actionLabel="Open settings"
          onAction={onOpenSettings}
        />
      ) : granted === null ? (
        <Card>
          <View style={styles.cardBody}>
            <Skeleton width="45%" height={14} />
            <Skeleton height={16} />
            <Skeleton width="70%" height={16} />
          </View>
        </Card>
      ) : (
        <>
          <ScreenTimeCard apps={apps} usage={usage} range={range} onRangeChange={onRangeChange} />
          <StorageCard apps={apps} storage={storage} onScanStorage={onScanStorage} />
        </>
      )}
      {notice ? <Text style={[styles.caption, { color: colors.muted }]}>{notice}</Text> : null}
    </View>
  );
}

function ScreenTimeCard({
  apps,
  usage,
  range,
  onRangeChange,
}: {
  apps: InstalledApp[];
  usage: UsageReading | null;
  range: UsageRange;
  onRangeChange: (range: UsageRange) => void;
}) {
  const { colors } = useTheme();
  const reading: Result<AppUsageTotal[]> | null =
    usage != null && usage.range === range ? usage.result : null;
  const rows = reading?.status === 'ok' ? mergeUsageRanking(apps, reading.value) : [];

  return (
    <Card>
      <View style={styles.cardBody}>
        <SectionHeader title="Screen time" />
        <View style={styles.chips}>
          {USAGE_RANGES.map((item) => (
            <Chip
              key={item}
              label={RANGE_LABELS[item]}
              selected={range === item}
              onPress={() => onRangeChange(item)}
            />
          ))}
        </View>
        {reading == null ? (
          <RankingSkeleton />
        ) : reading.status !== 'ok' ? (
          <Text style={[styles.caption, { color: colors.muted }]}>
            {reading.status === 'unavailable' ? reading.reason : 'Permission needed.'}
          </Text>
        ) : rows.length === 0 ? (
          <Text style={[styles.caption, { color: colors.muted }]}>
            Android has not recorded any foreground time for these apps yet.
          </Text>
        ) : (
          rows.map((row, index) => (
            <RankingRow
              key={row.packageName}
              row={row}
              rank={index + 1}
              value={formatUptime(row.totalTimeMs)}
            />
          ))
        )}
      </View>
    </Card>
  );
}

function StorageCard({
  apps,
  storage,
  onScanStorage,
}: {
  apps: InstalledApp[];
  storage: Result<AppStorageStats[]> | null;
  onScanStorage: () => void;
}) {
  const { colors } = useTheme();
  const rows = storage?.status === 'ok' ? mergeStorageRanking(apps, storage.value) : [];

  return (
    <Card>
      <View style={styles.cardBody}>
        <SectionHeader
          title="Largest apps"
          action={
            <PressableScale
              onPress={onScanStorage}
              accessibilityRole="button"
              accessibilityLabel="Scan app sizes again"
              hitSlop={{ top: 16, bottom: 16, left: 8, right: 8 }}
            >
              <Text style={[styles.scan, { color: colors.primary }]}>Scan again</Text>
            </PressableScale>
          }
        />
        {storage == null ? (
          <>
            <Text style={[styles.caption, { color: colors.muted }]}>
              Scanning app sizes — this can take a few seconds.
            </Text>
            <RankingSkeleton />
          </>
        ) : storage.status !== 'ok' ? (
          <Text style={[styles.caption, { color: colors.muted }]}>
            {storage.status === 'unavailable' ? storage.reason : 'Permission needed.'}
          </Text>
        ) : rows.length === 0 ? (
          <Text style={[styles.caption, { color: colors.muted }]}>
            Android did not report sizes for these apps.
          </Text>
        ) : (
          rows.map((row) => (
            <RankingRow
              key={row.packageName}
              row={row}
              value={formatByteSize(row.totalBytes)}
              caption={row.cacheBytes > 0 ? `Cache ${formatByteSize(row.cacheBytes)}` : null}
            />
          ))
        )}
        <Text style={[styles.caption, { color: colors.muted }]}>
          App, data and cache sizes as Android reports them.
        </Text>
      </View>
    </Card>
  );
}

function RankingRow({
  row,
  rank,
  value,
  caption,
}: {
  row: RankedApp;
  rank?: number;
  value: string;
  caption?: string | null;
}) {
  const { colors } = useTheme();
  const filled = Math.max(0.04, Math.min(1, row.share));

  return (
    <View style={styles.rankRow}>
      {rank != null ? <Text style={[styles.rank, { color: colors.muted }]}>{rank}</Text> : null}
      <AppIcon icon={row.icon} label={row.label} size={32} />
      <View style={styles.rankBody}>
        <Text numberOfLines={1} style={[styles.rankLabel, { color: colors.text }]}>
          {row.label}
        </Text>
        <View style={[styles.bar, { backgroundColor: colors.surface2 }]}>
          <View style={[styles.barFill, { backgroundColor: colors.accent, flex: filled }]} />
          <View style={{ flex: 1 - filled }} />
        </View>
      </View>
      <View style={styles.rankValue}>
        <Text style={[styles.rankValueText, { color: colors.text }]}>{value}</Text>
        {caption ? (
          <Text style={[styles.rankCaption, { color: colors.muted }]}>{caption}</Text>
        ) : null}
      </View>
    </View>
  );
}

function RankingSkeleton() {
  return (
    <View style={styles.skeleton}>
      {[0, 1, 2].map((row) => (
        <Skeleton key={row} height={28} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.lg,
  },
  cardBody: {
    gap: spacing.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  caption: {
    ...typography.caption,
  },
  scan: {
    ...typography.caption,
    fontFamily: 'Inter_600SemiBold',
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  rank: {
    ...typography.caption,
    fontFamily: 'JetBrainsMono_400Regular',
    width: 16,
    textAlign: 'center',
  },
  rankBody: {
    flex: 1,
    gap: 6,
  },
  rankLabel: {
    ...typography.body,
  },
  bar: {
    height: 4,
    borderRadius: 2,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  barFill: {
    borderRadius: 2,
  },
  rankValue: {
    alignItems: 'flex-end',
    gap: 2,
  },
  rankValueText: {
    ...typography.body,
    fontFamily: 'JetBrainsMono_400Regular',
  },
  rankCaption: {
    ...typography.caption,
  },
  skeleton: {
    gap: spacing.sm,
  },
});
