import { RefreshControl, StyleSheet, Text, View } from 'react-native';

import type { BatteryReading } from '@/core/native';
import { Button, Card, Chip, EmptyState, Screen } from '@/design-system/components';
import { useTheme } from '@/design-system/theme';
import { spacing, typography } from '@/design-system/tokens';
import { BatteryGauge, LiveGraph } from '@/design-system/visuals';
import { BatterySkeleton } from '@/features/battery/components/battery-skeleton';
import { useBattery } from '@/features/battery/hooks/use-battery';
import {
  batteryPlugLabel,
  batteryStatusLabel,
  buildBatteryStats,
} from '@/features/battery/services/battery-stats';

/** Battery detail: live gauge, stats grid, saver state, live graph and shortcuts. */
export function BatteryScreen() {
  const { colors } = useTheme();
  const { reading, samples, isPolling, refreshing, refresh, notice, openSettings } = useBattery();

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
      {reading === null ? (
        <BatterySkeleton />
      ) : reading.status !== 'ok' ? (
        <EmptyState
          icon="battery"
          title="Not available on this device"
          message={
            reading.status === 'denied'
              ? `Permission needed: ${reading.permission}`
              : reading.reason
          }
        />
      ) : (
        <BatteryDetails
          reading={reading.value}
          samples={samples}
          isPolling={isPolling}
          onOpenSaver={() => openSettings('battery-saver')}
        />
      )}

      <View style={styles.shortcuts}>
        <Button
          title="Battery saver settings"
          icon="zap"
          variant="secondary"
          onPress={() => openSettings('battery-saver')}
        />
        <Button
          title="System battery usage"
          icon="gauge"
          variant="secondary"
          onPress={() => openSettings('battery-usage')}
        />
        {notice ? <Text style={[styles.notice, { color: colors.muted }]}>{notice}</Text> : null}
      </View>
    </Screen>
  );
}

type DetailsProps = {
  reading: BatteryReading;
  samples: number[];
  isPolling: boolean;
  onOpenSaver: () => void;
};

function BatteryDetails({ reading, samples, isPolling, onOpenSaver }: DetailsProps) {
  const { colors } = useTheme();
  const stats = buildBatteryStats(reading);
  const percent = reading.percent;
  const charging = reading.status === 'charging';
  const plug = batteryPlugLabel(reading.plugged);
  const status = batteryStatusLabel(reading.status);
  const lastSample = samples.at(-1);

  const saverChip = (
    <Chip
      label={reading.powerSave ? 'Battery saver on' : 'Battery saver off'}
      dotColor={reading.powerSave ? colors.good : colors.muted}
      onPress={onOpenSaver}
    />
  );

  return (
    <View style={styles.sections}>
      <Card>
        <View style={styles.gauge}>
          {percent != null ? (
            <>
              <BatteryGauge value={percent} charging={charging} width={240} height={104} />
              <Text style={[styles.caption, { color: colors.muted }]}>
                {plug ? `${status} · ${plug}` : status}
              </Text>
            </>
          ) : null}
          {saverChip}
        </View>
      </Card>

      {stats.length > 0 ? (
        <Card>
          <View style={styles.grid}>
            {stats.map((stat) => (
              <View key={stat.key} style={styles.cell}>
                <Text style={[styles.cellLabel, { color: colors.muted }]}>{stat.label}</Text>
                <Text style={[styles.cellValue, { color: colors.text }]}>{stat.value}</Text>
              </View>
            ))}
          </View>
        </Card>
      ) : null}

      {samples.length >= 2 && lastSample != null ? (
        <Card>
          <View style={styles.graphHead}>
            <Text style={[styles.cellLabel, { color: colors.muted }]}>Live current (mA)</Text>
            <Text style={[styles.cellValue, { color: colors.text }]}>{lastSample} mA</Text>
          </View>
          <LiveGraph
            data={samples}
            paused={!isPolling}
            height={120}
            accessibilityLabel="Live current graph, milliamps"
          />
        </Card>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sections: {
    gap: spacing.lg,
  },
  gauge: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  caption: {
    ...typography.caption,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: '50%',
    gap: 2,
    paddingVertical: spacing.sm,
  },
  cellLabel: {
    ...typography.caption,
  },
  cellValue: {
    ...typography.mono,
  },
  graphHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  shortcuts: {
    gap: spacing.sm,
  },
  notice: {
    ...typography.caption,
    textAlign: 'center',
  },
});
