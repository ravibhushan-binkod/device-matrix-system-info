import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { HeatShimmer } from '@/design-system/animations/heat-shimmer';
import { LivePulse } from '@/design-system/animations/live-pulse';
import { useCountUp } from '@/design-system/animations/use-count-up';
import { withAlpha } from '@/design-system/color';
import { Icon } from '@/design-system/icon';
import { radius, spacing, typography } from '@/design-system/tokens';
import { useTheme } from '@/design-system/theme';
import { TileHeader, tileAccentColor } from '@/features/dashboard/components/tile-card';
import type {
  DashboardTileDefinition,
  DashboardTileId,
  DashboardTileSize,
} from '@/features/dashboard/services/dashboard-tiles';
import { useAccelerometerPreview } from '@/features/dashboard/hooks/use-accelerometer-preview';
import type {
  DashboardInventory,
  DashboardSummary,
  ConnectivityState,
} from '@/features/dashboard/types';
import { formatBytes } from '@/core/utils/format-bytes';
import { formatFrequencyKhz } from '@/core/utils/format-frequency';
import { formatTemperature } from '@/core/utils/format-temperature';
import {
  BatteryGauge,
  LiveGraph,
  MemoryDonut,
  SignalBars,
  StorageBar,
  ThermalGauge,
} from '@/design-system/visuals';

type Props = {
  id: DashboardTileId;
  size: DashboardTileSize;
  definition: DashboardTileDefinition;
  summary: DashboardSummary;
  inventory: DashboardInventory | null;
  cpuHistory: number[];
  memoryHistory: number[];
};

export function TileContent({
  id,
  size,
  definition,
  summary,
  inventory,
  cpuHistory,
  memoryHistory,
}: Props) {
  switch (id) {
    case 'cpu':
      return <CpuTile size={size} definition={definition} summary={summary} history={cpuHistory} />;
    case 'memory':
      return (
        <MemoryTile size={size} definition={definition} summary={summary} history={memoryHistory} />
      );
    case 'storage':
      return <StorageTile size={size} definition={definition} summary={summary} />;
    case 'battery':
      return <BatteryTile size={size} definition={definition} summary={summary} />;
    case 'thermal':
      return <ThermalTile size={size} definition={definition} summary={summary} />;
    case 'display':
      return <DisplayTile size={size} definition={definition} summary={summary} />;
    case 'network':
      return <NetworkTile size={size} definition={definition} summary={summary} />;
    case 'sensors':
      return <SensorsTile definition={definition} summary={summary} inventory={inventory} />;
    case 'camera':
      return <CameraTile definition={definition} inventory={inventory} />;
    case 'connectivity':
      return <ConnectivityTile definition={definition} summary={summary} inventory={inventory} />;
    default:
      return null;
  }
}

function Fallback({ text = 'Not available on this device' }: { text?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.fallback}>
      <Icon name="alert" size={20} color={colors.muted} />
      <Text style={[styles.fallbackText, { color: colors.muted }]}>{text}</Text>
    </View>
  );
}

type TileProps = {
  size: DashboardTileSize;
  definition: DashboardTileDefinition;
  summary: DashboardSummary;
};

function CpuTile({ definition, summary, history }: TileProps & { history: number[] }) {
  const { colors } = useTheme();
  const cpu = summary.cpu;
  const averageGhz =
    cpu.status === 'ok' && cpu.value.averageMhz != null ? cpu.value.averageMhz / 1000 : null;
  const display = useCountUp(averageGhz ?? 0, { decimals: 2 });
  const tint = tileAccentColor(definition.accent, colors);

  return (
    <>
      <TileHeader
        accent={definition.accent}
        title={definition.title}
        icon={definition.icon}
        trailing={
          cpu.status === 'ok' ? (
            <Text style={[styles.headerMeta, { color: colors.muted }]}>
              {cpu.value.cores} cores
            </Text>
          ) : null
        }
      />
      {cpu.status !== 'ok' ? (
        <Fallback />
      ) : (
        <>
          <View style={styles.metricRow}>
            <View style={styles.metricLeft}>
              <Text style={[styles.metric, { color: colors.text }]}>
                {averageGhz != null ? display.toFixed(2) : '—'}
              </Text>
              <Text style={[styles.metricUnit, { color: colors.muted }]}>GHz average</Text>
            </View>
            <View style={styles.metricRight}>
              <MetricPill
                label={
                  cpu.value.maxMhz != null
                    ? `Max ${formatFrequencyKhz(cpu.value.maxMhz * 1000)}`
                    : 'Max clock hidden'
                }
                tint={tint}
              />
            </View>
          </View>
          <Text numberOfLines={1} style={[styles.bodyLine, { color: colors.muted }]}>
            {cpu.value.chipset ?? 'Chipset name not reported'}
          </Text>
          <View style={styles.graph}>
            <LiveGraph
              data={history}
              height={44}
              color={tint}
              accessibilityLabel="Average CPU clock history"
            />
          </View>
        </>
      )}
    </>
  );
}

function MemoryTile({ definition, summary, history }: TileProps & { history: number[] }) {
  const { colors } = useTheme();
  const memory = summary.memory;
  const percent = memory.status === 'ok' ? memory.value.percent : null;
  const used = memory.status === 'ok' ? memory.value.usedBytes : null;
  const total = memory.status === 'ok' ? memory.value.totalBytes : null;
  const free = used != null && total != null ? Math.max(0, total - used) : null;

  return (
    <>
      <TileHeader accent={definition.accent} title={definition.title} icon={definition.icon} />
      {memory.status !== 'ok' || percent == null ? (
        <Fallback />
      ) : (
        <>
          <View style={styles.memoryRow}>
            <MemoryDonut value={percent} size={78} thickness={8} label="%" />
            <View style={styles.memoryCopy}>
              <Text numberOfLines={1} style={[styles.bodyStrong, { color: colors.text }]}>
                {used != null ? formatBytes(used) : '—'}
              </Text>
              <Text numberOfLines={1} style={[styles.caption, { color: colors.muted }]}>
                of {total != null ? formatBytes(total) : '—'}
              </Text>
              <Text numberOfLines={2} style={[styles.caption, { color: colors.muted }]}>
                {free != null ? `${formatBytes(free)} free` : 'Free not reported'}
              </Text>
            </View>
          </View>
          <View style={styles.graphSmall}>
            <LiveGraph
              data={history}
              height={34}
              color={colors.violet}
              accessibilityLabel="Memory use history"
            />
          </View>
        </>
      )}
    </>
  );
}

function StorageTile({ definition, summary }: TileProps) {
  const { colors } = useTheme();
  const storage = summary.storage;
  const percent = storage.status === 'ok' ? storage.value.percent : null;
  const used = storage.status === 'ok' ? storage.value.usedBytes : null;
  const total = storage.status === 'ok' ? storage.value.totalBytes : null;
  const free = used != null && total != null ? Math.max(0, total - used) : null;
  const tint = tileAccentColor(definition.accent, colors);

  return (
    <>
      <TileHeader accent={definition.accent} title={definition.title} icon={definition.icon} />
      {storage.status !== 'ok' || percent == null ? (
        <Fallback />
      ) : (
        <>
          <View style={styles.metricRow}>
            <Text style={[styles.metric, { color: colors.text }]}>{Math.round(percent)}%</Text>
            <Text style={[styles.metricUnit, { color: colors.muted }]}>used</Text>
          </View>
          <Text numberOfLines={1} style={[styles.caption, { color: colors.muted }]}>
            {used != null ? formatBytes(used) : '—'} of {total != null ? formatBytes(total) : '—'}
          </Text>
          <View style={styles.storageBar}>
            <StorageBar
              segments={[
                {
                  key: 'used',
                  label: 'Used',
                  value: used ?? 0,
                  color: tint,
                  valueLabel: used != null ? formatBytes(used) : undefined,
                },
              ]}
              total={total ?? undefined}
              height={14}
              showLegend={false}
            />
          </View>
          <Text numberOfLines={1} style={[styles.caption, { color: colors.muted }]}>
            {free != null ? `${formatBytes(free)} free` : 'Free space not reported'}
          </Text>
        </>
      )}
    </>
  );
}

function gaugeWidth(size: DashboardTileSize, windowWidth: number): number {
  if (size === 'l') return Math.max(120, windowWidth - spacing.lg * 2 - 34);
  return Math.max(96, (windowWidth - spacing.lg * 2 - spacing.md) / 2 - 34);
}

function BatteryTile({ definition, summary }: TileProps) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const battery = summary.battery;
  const percent = battery.status === 'ok' ? battery.value.percent : null;
  const charging = battery.status === 'ok' && battery.value.charging;
  const watts = battery.status === 'ok' ? battery.value.watts : null;
  const temperature = battery.status === 'ok' ? battery.value.temperatureC : null;
  const gaugedWidth = Math.min(190, gaugeWidth('m', width));

  return (
    <>
      <TileHeader
        accent={definition.accent}
        title={definition.title}
        icon={definition.icon}
        trailing={charging ? <LivePulse color={colors.good} size={7} /> : null}
      />
      {battery.status !== 'ok' ? (
        <Fallback />
      ) : (
        <>
          {percent != null ? (
            <BatteryGauge
              value={percent}
              charging={charging}
              width={gaugedWidth}
              height={78}
              compact
              particles
            />
          ) : (
            <View style={styles.batteryMissing}>
              <Text style={[styles.metric, { color: colors.text }]}>—</Text>
              <Text style={[styles.caption, { color: colors.muted }]}>Level not reported</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Text numberOfLines={1} style={[styles.caption, { color: colors.muted }]}>
              {watts != null ? `${watts.toFixed(1)} W` : 'No power data'}
            </Text>
            <Text numberOfLines={1} style={[styles.caption, { color: colors.muted }]}>
              {temperature != null ? formatTemperature(temperature) : 'No temp'}
            </Text>
          </View>
        </>
      )}
    </>
  );
}

function ThermalTile({ definition, summary }: TileProps) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const thermal = summary.thermal;
  const batteryTemperature =
    summary.battery.status === 'ok' ? summary.battery.value.temperatureC : null;
  const temperature =
    thermal.status === 'ok'
      ? (thermal.value.temperatureC ?? batteryTemperature)
      : batteryTemperature;
  const statusLabel = thermal.status === 'ok' ? thermal.value.statusLabel : null;
  const loadPercent = thermal.status === 'ok' ? thermal.value.loadPercent : null;
  const tint = tileAccentColor(definition.accent, colors);

  return (
    <>
      <TileHeader
        accent={definition.accent}
        title={definition.title}
        icon={definition.icon}
        trailing={
          statusLabel ? (
            <Text style={[styles.headerMeta, { color: tint }]}>{statusLabel}</Text>
          ) : null
        }
      />
      {temperature == null ? (
        <Fallback text="Temperature not reported" />
      ) : (
        <>
          <View style={styles.heat}>
            <HeatShimmer
              width={gaugeWidth('s', width) - 4}
              height={50}
              color={colors.warning}
              active={temperature >= 42 || (loadPercent ?? 0) >= 70}
            />
          </View>
          <ThermalGauge
            value={temperature}
            min={30}
            max={90}
            size={72}
            thickness={8}
            accessibilityLabel="Battery temperature"
          />
        </>
      )}
    </>
  );
}

function DisplayTile({ definition, summary }: TileProps) {
  const { colors } = useTheme();
  const display = summary.display;

  return (
    <>
      <TileHeader accent={definition.accent} title={definition.title} icon={definition.icon} />
      {display.status !== 'ok' ? (
        <Fallback />
      ) : (
        <View style={styles.displayBody}>
          <Text numberOfLines={1} style={[styles.bodyStrong, { color: colors.text }]}>
            {display.value.resolution ?? 'Resolution not reported'}
          </Text>
          <MetricPill
            label={
              display.value.refreshRateHz != null
                ? `${Math.round(display.value.refreshRateHz)} Hz`
                : 'Refresh not reported'
            }
            tint={colors.primary}
          />
          <Text numberOfLines={1} style={[styles.caption, { color: colors.muted }]}>
            {display.value.diagonalInches != null
              ? `${display.value.diagonalInches.toFixed(1)}″ panel`
              : 'Panel size not reported'}
          </Text>
        </View>
      )}
    </>
  );
}

function NetworkTile({ definition, summary }: TileProps) {
  const { colors } = useTheme();
  const network = summary.network;
  const tint = tileAccentColor(definition.accent, colors);

  return (
    <>
      <TileHeader
        accent={definition.accent}
        title={definition.title}
        icon={definition.icon}
        trailing={
          network.status === 'ok' ? (
            <LivePulse
              color={network.value.connected ? colors.good : colors.muted}
              size={7}
              active={network.value.connected}
            />
          ) : null
        }
      />
      {network.status !== 'ok' ? (
        <Fallback />
      ) : (
        <>
          <View style={styles.networkTop}>
            <Text numberOfLines={1} style={[styles.bodyStrong, { color: colors.text }]}>
              {network.value.typeLabel}
            </Text>
            <SignalBars level={network.value.signalBars} height={16} barWidth={4} color={tint} />
          </View>
          <Text numberOfLines={1} style={[styles.networkName, { color: colors.text }]}>
            {network.value.name ??
              (network.value.connected ? 'Name hidden' : 'No active network')}
          </Text>
          <Text numberOfLines={1} style={[styles.caption, { color: colors.muted }]}>
            {network.value.detail ?? network.value.signalLabel ?? '—'}
          </Text>
          <View style={styles.networkBottom}>
            <MetricPill
              label={
                network.value.linkSpeedMbps != null
                  ? `${Math.round(network.value.linkSpeedMbps)} Mbps`
                  : 'Speed not reported'
              }
              tint={tint}
            />
          </View>
        </>
      )}
    </>
  );
}

type OrbProps = {
  x: SharedValue<number>;
  y: SharedValue<number>;
  active: boolean;
  color: string;
};

function AccelerometerOrb({ x, y, active, color }: OrbProps) {
  const { colors } = useTheme();
  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value * 16 }, { translateY: y.value * 16 }],
  }));

  return (
    <View
      style={[
        styles.orb,
        {
          borderColor: withAlpha(color, 0.2),
          backgroundColor: withAlpha(color, 0.05),
        },
      ]}
    >
      <View style={[styles.orbRing, { borderColor: withAlpha(colors.text, 0.08) }]} />
      <Animated.View
        style={[styles.orbDot, { backgroundColor: active ? color : colors.muted }, dotStyle]}
      />
    </View>
  );
}

function SensorsTile({
  definition,
  summary,
  inventory,
}: Omit<TileProps, 'size'> & { inventory: DashboardInventory | null }) {
  const { colors } = useTheme();
  const sensors = inventory?.sensors ?? null;
  const accelerometerType = sensors?.status === 'ok' ? sensors.value.accelerometerType : null;
  const accelerometer = useAccelerometerPreview(accelerometerType);
  const tint = tileAccentColor(definition.accent, colors);

  return (
    <>
      <TileHeader
        accent={definition.accent}
        title={definition.title}
        icon={definition.icon}
        trailing={accelerometer.streaming ? <LivePulse color={colors.good} size={7} /> : null}
      />
      {inventory == null ? (
        <Text style={[styles.caption, { color: colors.muted }]}>Reading sensors…</Text>
      ) : sensors?.status !== 'ok' ? (
        <Fallback text="Sensor list not available" />
      ) : (
        <>
          <View style={styles.sensorRow}>
            <View style={styles.metricLeft}>
              <Text style={[styles.metric, { color: colors.text }]}>{sensors.value.count}</Text>
              <Text style={[styles.caption, { color: colors.muted }]}>sensors reported</Text>
            </View>
            <AccelerometerOrb
              x={accelerometer.x}
              y={accelerometer.y}
              active={accelerometer.streaming}
              color={tint}
            />
          </View>
          <Text numberOfLines={1} style={[styles.caption, { color: colors.muted }]}>
            {accelerometer.streaming
              ? 'Live tilt preview'
              : accelerometer.available
                ? 'Tilt preview paused'
                : 'No accelerometer reported'}
          </Text>
        </>
      )}
    </>
  );
}

function CameraTile({
  definition,
  inventory,
}: Omit<TileProps, 'size' | 'summary'> & { inventory: DashboardInventory | null }) {
  const { colors } = useTheme();
  const cameras = inventory?.cameras ?? null;

  return (
    <>
      <TileHeader accent={definition.accent} title={definition.title} icon={definition.icon} />
      {inventory == null ? (
        <Text style={[styles.caption, { color: colors.muted }]}>Reading cameras…</Text>
      ) : cameras?.status !== 'ok' ? (
        <Fallback text="Camera list not available" />
      ) : (
        <>
          <View style={styles.cameraMetric}>
            <Text style={[styles.metric, { color: colors.text }]}>{cameras.value.lensCount}</Text>
            <Text style={[styles.metricUnit, { color: colors.muted }]}>lenses</Text>
          </View>
          <Text numberOfLines={1} style={[styles.caption, { color: colors.muted }]}>
            {cameras.value.back} back · {cameras.value.front} front
          </Text>
        </>
      )}
    </>
  );
}

const CONNECTIVITY_LABELS: Record<ConnectivityState, string> = {
  on: 'On',
  off: 'Off',
  permission: 'Permission',
  unavailable: 'No radio',
  unknown: 'Unknown',
};

type ConnectivityEntryProps = {
  icon: 'bluetooth' | 'nfc' | 'sensors';
  label: string;
  stateLabel: string;
  active: boolean;
  tint: string;
};

function ConnectivityEntry({ icon, label, stateLabel, active, tint }: ConnectivityEntryProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.connectivityEntry}>
      <View
        style={[
          styles.connectivityIcon,
          {
            backgroundColor: withAlpha(active ? tint : colors.muted, 0.1),
            borderColor: withAlpha(active ? tint : colors.muted, 0.22),
          },
        ]}
      >
        <Icon name={icon} size={20} color={active ? tint : colors.muted} />
      </View>
      <Text numberOfLines={1} style={[styles.caption, { color: colors.text }]}>
        {label}
      </Text>
      <View style={styles.connectivityState}>
        <View
          style={[
            styles.stateDot,
            { backgroundColor: active ? tint : withAlpha(colors.muted, 0.5) },
          ]}
        />
        <Text numberOfLines={1} style={[styles.caption, { color: colors.muted }]}>
          {stateLabel}
        </Text>
      </View>
    </View>
  );
}

function ConnectivityTile({
  definition,
  summary,
  inventory,
}: Omit<TileProps, 'size'> & { inventory: DashboardInventory | null }) {
  const { colors } = useTheme();
  const connectivity = summary.connectivity;
  const bluetooth = connectivity.status === 'ok' ? connectivity.value.bluetooth : 'unknown';
  const nfc = connectivity.status === 'ok' ? connectivity.value.nfc : 'unknown';
  const uwb = inventory?.uwb ?? (connectivity.status === 'ok' ? connectivity.value.uwb : 'unknown');
  const uwbActive = uwb === 'supported';

  return (
    <>
      <TileHeader accent={definition.accent} title={definition.title} icon={definition.icon} />
      <View style={styles.connectivityRow}>
        <ConnectivityEntry
          icon="bluetooth"
          label="Bluetooth"
          stateLabel={CONNECTIVITY_LABELS[bluetooth]}
          active={bluetooth === 'on'}
          tint={tileAccentColor('accent', colors)}
        />
        <ConnectivityEntry
          icon="nfc"
          label="NFC"
          stateLabel={CONNECTIVITY_LABELS[nfc]}
          active={nfc === 'on'}
          tint={colors.violet}
        />
        <ConnectivityEntry
          icon="sensors"
          label="UWB"
          stateLabel={uwbActive ? 'Supported' : uwb === 'unavailable' ? 'Not on device' : 'Unknown'}
          active={uwbActive}
          tint={colors.primary}
        />
      </View>
      <Text numberOfLines={1} style={[styles.caption, { color: colors.muted }]}>
        UWB shows hardware support, not a switch.
      </Text>
    </>
  );
}

function MetricPill({ label, tint }: { label: string; tint: string }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: withAlpha(tint, 0.1), borderColor: withAlpha(tint, 0.22) },
      ]}
    >
      <Text numberOfLines={1} style={[styles.pillText, { color: colors.text }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  fallbackText: {
    ...typography.caption,
    textAlign: 'center',
    paddingHorizontal: spacing.xs,
  },
  headerMeta: {
    ...typography.caption,
    fontFamily: 'Inter_600SemiBold',
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  metricLeft: {
    flexShrink: 1,
  },
  metricRight: {
    flexShrink: 0,
    alignItems: 'flex-end',
  },
  metric: {
    ...typography.display,
    fontVariant: ['tabular-nums'],
    lineHeight: 36,
  },
  metricUnit: {
    ...typography.caption,
    marginTop: -2,
  },
  bodyLine: {
    ...typography.body,
  },
  bodyStrong: {
    ...typography.body,
    fontFamily: 'Inter_600SemiBold',
  },
  caption: {
    ...typography.caption,
  },
  graph: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  graphSmall: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  pill: {
    borderWidth: 1,
    borderRadius: radius.chip,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    maxWidth: '100%',
  },
  pillText: {
    ...typography.caption,
    fontFamily: 'Inter_600SemiBold',
    fontVariant: ['tabular-nums'],
  },
  memoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  memoryCopy: {
    flex: 1,
    gap: 1,
  },
  storageBar: {
    marginTop: spacing.xs,
  },
  batteryMissing: {
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  heat: {
    position: 'absolute',
    top: 28,
    left: 0,
  },
  displayBody: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.xs,
  },
  displayResolution: {
    ...typography.title,
    fontVariant: ['tabular-nums'],
  },
  networkTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  networkName: {
    ...typography.title,
  },
  networkBottom: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  orb: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbRing: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
  },
  orbDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  sensorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  cameraMetric: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  connectivityRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  connectivityEntry: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  connectivityIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectivityState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stateDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
});
