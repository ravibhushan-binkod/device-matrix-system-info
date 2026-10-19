import { RefreshControl, StyleSheet, Text, View } from 'react-native';

import {
  AdSlot,
  Card,
  Chip,
  EmptyState,
  Screen,
  Skeleton,
  StatRow,
} from '@/design-system/components';
import type { StatusTone } from '@/design-system/status';
import { useTheme } from '@/design-system/theme';
import { spacing, typography, type AppColors } from '@/design-system/tokens';
import { ThermalGauge } from '@/design-system/visuals';
import { formatTemperature } from '@/core/utils/format-temperature';
import { useThermal } from '@/features/thermal/hooks/use-thermal';

const NOT_AVAILABLE = 'Not available on this device';

function toneColor(tone: StatusTone, colors: AppColors): string {
  if (tone === 'critical') return colors.critical;
  if (tone === 'warning') return colors.warning;
  return colors.good;
}

/** Thermal: a headroom-based load gauge, the status chip and the battery temperature. */
export function ThermalScreen() {
  const { colors } = useTheme();
  const { info, refreshing, refresh } = useThermal();

  const result = info;

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
      {result === null ? (
        <ThermalSkeleton />
      ) : result.status === 'ok' ? (
        <>
          <Card>
            <View style={styles.cardBody}>
              <View style={styles.cardHead}>
                <Text style={[styles.sectionTitle, { color: colors.muted }]}>Thermal load</Text>
                <Chip
                  label={result.value.statusLabel ?? 'Status unknown'}
                  dotColor={toneColor(result.value.tone, colors)}
                />
              </View>
              {result.value.loadPercent != null ? (
                <View style={styles.gaugeWrap}>
                  <ThermalGauge
                    value={result.value.loadPercent}
                    min={0}
                    max={100}
                    unit="%"
                    size={240}
                  />
                </View>
              ) : (
                <Text style={[styles.unavailableTitle, { color: colors.text }]}>
                  {NOT_AVAILABLE}
                </Text>
              )}
              <Text style={[styles.caption, { color: colors.muted }]}>
                Derived from Android&apos;s thermal headroom — 0 % is cool, 100 % means the system
                reports no headroom left.
              </Text>
            </View>
          </Card>

          <AdSlot placement="thermal-mid" />

          <Card>
            <View style={styles.cardBody}>
              <StatRow
                label="Status"
                value={result.value.statusLabel ?? NOT_AVAILABLE}
                copyable={false}
              />
              <StatRow
                label="Headroom"
                value={
                  result.value.headroomPercent == null
                    ? NOT_AVAILABLE
                    : `${result.value.headroomPercent}%`
                }
                copyable={false}
              />
              <StatRow
                label="Battery temperature"
                value={
                  result.value.batteryTemperatureC == null
                    ? NOT_AVAILABLE
                    : formatTemperature(result.value.batteryTemperatureC, 'C', 1)
                }
                copyable={false}
              />
            </View>
          </Card>
        </>
      ) : (
        <EmptyState
          icon="thermometer"
          title="Thermal status"
          message={
            result.status === 'unavailable'
              ? result.reason
              : `Permission needed: ${result.permission}`
          }
        />
      )}
    </Screen>
  );
}

function ThermalSkeleton() {
  return (
    <View style={styles.content}>
      <Card>
        <View style={styles.cardBody}>
          <Skeleton width="45%" height={14} />
          <View style={styles.gaugeWrap}>
            <Skeleton width={240} height={136} />
          </View>
        </View>
      </Card>
      <Card>
        <View style={styles.cardBody}>
          {[0, 1, 2].map((row) => (
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
  gaugeWrap: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  caption: {
    ...typography.caption,
  },
  unavailableTitle: {
    ...typography.body,
  },
});
