import { useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';

import type { BatteryReading } from '@/core/native';
import { useFormatters } from '@/core/units/use-formatters';
import type { ResolvedUnits } from '@/core/units/types';
import {
  AdSlot,
  Button,
  Card,
  Chip,
  CopyableText,
  EmptyState,
  InfoSheet,
  Screen,
  SectionHeader,
} from '@/design-system/components';
import { useTheme } from '@/design-system/theme';
import { spacing, typography } from '@/design-system/tokens';
import { BatteryGauge, LiveGraph } from '@/design-system/visuals';
import { BatterySkeleton } from '@/features/battery/components/battery-skeleton';
import { useBattery } from '@/features/battery/hooks/use-battery';
import {
  batteryPlugLabel,
  batterySeries,
  batteryStatusLabel,
  buildBatteryStats,
  formatGraphValue,
} from '@/features/battery/services/battery-stats';
import type { BatteryGraphMetric, BatteryGraphSample } from '@/features/battery/types';

const NOT_AVAILABLE = 'Not available on this device';

const BATTERY_SHEET = {
  title: 'Battery: what this means',
  paragraphs: [
    'The gauge shows the charge level Android reports. The chip is the charging state, and the battery-saver chip opens Android’s own power-saving setting — Device Matrix never changes it for you.',
    'Power is computed live from the battery’s voltage and instantaneous current (V × I). A negative value means the phone is drawing from the battery; a positive one means the charger is feeding it. It is the battery-side power, not the charger’s rated output.',
    'Capacity and time to full are estimates and labelled so: capacity comes from Android’s charge counter divided by the current percentage, and time to full divides the charge still missing by the right-now current. Cycle count is Android 14+ and some brands hide it.',
    'The graph follows the current, power or temperature you pick, with one point every two seconds while the screen is open.',
  ],
};

const GRAPH_METRICS = [
  {
    key: 'current',
    chip: 'mA',
    label: 'Live current (mA)',
    accessibility: 'Live current graph, milliamps',
  },
  { key: 'power', chip: 'W', label: 'Live power (W)', accessibility: 'Live power graph, watts' },
  {
    key: 'temperature',
    chip: '°C',
    label: 'Live temperature (°C)',
    accessibility: 'Live temperature graph, celsius',
  },
] as const satisfies readonly {
  key: BatteryGraphMetric;
  chip: string;
  label: string;
  accessibility: string;
}[];

/** The graph chips and labels in the units the user picked. */
function graphMetrics(units: ResolvedUnits) {
  return GRAPH_METRICS.map((entry) => {
    if (entry.key === 'power') {
      return {
        ...entry,
        chip: units.power,
        label: `Live power (${units.power})`,
        accessibility:
          units.power === 'mW' ? 'Live power graph, milliwatts' : 'Live power graph, watts',
      };
    }
    if (entry.key === 'temperature') {
      return {
        ...entry,
        chip: `°${units.temperature}`,
        label: `Live temperature (°${units.temperature})`,
        accessibility:
          units.temperature === 'F'
            ? 'Live temperature graph, fahrenheit'
            : 'Live temperature graph, celsius',
      };
    }
    return entry;
  });
}

/** Battery detail: live gauge, stats grid, saver state, live graph and shortcuts. */
export function BatteryScreen() {
  const { colors } = useTheme();
  const { reading, samples, isPolling, refreshing, refresh, notice, openSettings } = useBattery();
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
          onOpenInfo={() => setSheetVisible(true)}
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

      <InfoSheet
        visible={sheetVisible}
        title={BATTERY_SHEET.title}
        paragraphs={[...BATTERY_SHEET.paragraphs]}
        onClose={() => setSheetVisible(false)}
      />
    </Screen>
  );
}

type DetailsProps = {
  reading: BatteryReading;
  samples: BatteryGraphSample[];
  isPolling: boolean;
  onOpenSaver: () => void;
  onOpenInfo: () => void;
};

function BatteryDetails({ reading, samples, isPolling, onOpenSaver, onOpenInfo }: DetailsProps) {
  const { colors } = useTheme();
  const { units } = useFormatters();
  const [metric, setMetric] = useState<BatteryGraphMetric>('current');
  const metrics = useMemo(() => graphMetrics(units), [units]);
  const stats = buildBatteryStats(reading, units);
  const percent = reading.percent;
  const charging = reading.status === 'charging';
  const plug = batteryPlugLabel(reading.plugged);
  const status = batteryStatusLabel(reading.status);
  const series = batterySeries(samples, metric);
  const last = series.length > 0 ? series[series.length - 1] : null;
  const valueText = last == null ? null : formatGraphValue(metric, last, units);
  const metricInfo =
    metrics.find((entry) => entry.key === metric) ?? metrics[0] ?? GRAPH_METRICS[0];
  const statusLine = plug ? `${status} · ${plug}` : status;
  const batteryCopy = [
    percent == null ? null : `Level: ${Math.round(percent)}%`,
    `Status: ${status}`,
    plug ? `Plug type: ${plug}` : null,
    `Battery saver: ${reading.powerSave ? 'On' : 'Off'}`,
  ]
    .filter((line): line is string => line != null)
    .join('\n');
  const statsCopy = stats.map((stat) => `${stat.label}: ${stat.value}`).join('\n');

  const saverChip = (
    <Chip
      label={reading.powerSave ? 'Battery saver on' : 'Battery saver off'}
      dotColor={reading.powerSave ? colors.good : colors.muted}
      onPress={onOpenSaver}
    />
  );

  return (
    <View style={styles.sections}>
      <View style={styles.group}>
        <SectionHeader title="Battery" copyText={batteryCopy} onInfo={onOpenInfo} />
        <Card>
          <View style={styles.gauge}>
            {percent != null ? (
              <>
                <BatteryGauge value={percent} charging={charging} width={240} height={104} />
                <CopyableText
                  value={statusLine}
                  copyLabel="Battery status"
                  style={[styles.caption, { color: colors.muted }]}
                >
                  {statusLine}
                </CopyableText>
              </>
            ) : null}
            {saverChip}
          </View>
        </Card>
      </View>

      <AdSlot placement="battery-mid" />

      {stats.length > 0 ? (
        <View style={styles.group}>
          <SectionHeader title="Stats" copyText={statsCopy} onInfo={onOpenInfo} />
          <Card>
            <View style={styles.grid}>
              {stats.map((stat) => (
                <View key={stat.key} style={styles.cell}>
                  <Text style={[styles.cellLabel, { color: colors.muted }]}>{stat.label}</Text>
                  <CopyableText
                    value={stat.value}
                    copyLabel={stat.label}
                    style={[styles.cellValue, { color: colors.text }]}
                  >
                    {stat.value}
                  </CopyableText>
                </View>
              ))}
            </View>
          </Card>
        </View>
      ) : null}

      {samples.length >= 2 ? (
        <View style={styles.group}>
          <SectionHeader
            title="Live graph"
            copyText={valueText == null ? undefined : `${metricInfo.label}: ${valueText}`}
            onInfo={onOpenInfo}
          />
          <Card>
            {series.length >= 2 && last != null ? (
              <>
                <View style={styles.graphHead}>
                  <Text style={[styles.cellLabel, { color: colors.muted }]}>
                    {metricInfo.label}
                  </Text>
                  <CopyableText
                    value={valueText}
                    copyLabel={metricInfo.label}
                    style={[styles.cellValue, { color: colors.text }]}
                  >
                    {valueText}
                  </CopyableText>
                </View>
                <View style={styles.metricRow}>
                  {metrics.map((entry) => (
                    <Chip
                      key={entry.key}
                      label={entry.chip}
                      selected={entry.key === metric}
                      onPress={() => setMetric(entry.key)}
                    />
                  ))}
                </View>
                <LiveGraph
                  data={series}
                  paused={!isPolling}
                  height={120}
                  accessibilityLabel={metricInfo.accessibility}
                />
              </>
            ) : (
              <View style={styles.unavailable}>
                <View style={styles.metricRow}>
                  {metrics.map((entry) => (
                    <Chip
                      key={entry.key}
                      label={entry.chip}
                      selected={entry.key === metric}
                      onPress={() => setMetric(entry.key)}
                    />
                  ))}
                </View>
                <Text style={[styles.unavailableTitle, { color: colors.text }]}>
                  {NOT_AVAILABLE}
                </Text>
                <Text style={[styles.caption, { color: colors.muted }]}>
                  This device did not report {metricInfo.label.replace('Live ', '').toLowerCase()}{' '}
                  while the screen was open.
                </Text>
              </View>
            )}{' '}
          </Card>
        </View>
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
  group: {
    gap: spacing.sm,
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
  metricRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  unavailable: {
    gap: spacing.xs,
  },
  unavailableTitle: {
    ...typography.body,
  },
  shortcuts: {
    gap: spacing.sm,
  },
  notice: {
    ...typography.caption,
    textAlign: 'center',
  },
});
