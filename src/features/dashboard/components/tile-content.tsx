import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { useFormatters } from '@/core/units';
import { getActiveUnits } from '@/core/units/active';
import {
  formatFrequencyKhz,
  formatPower,
  formatScreenSize,
  formatTemperature,
} from '@/core/units/format';
import type { ResolvedUnits } from '@/core/units/types';
import { celsiusToFahrenheit } from '@/core/utils/format-temperature';
import { LivePulse } from '@/design-system/animations/live-pulse';
import { useCountUp } from '@/design-system/animations/use-count-up';
import { withAlpha } from '@/design-system/color';
import { SensitiveValue } from '@/design-system/components';
import { Icon } from '@/design-system/icon';
import { spacing, typography } from '@/design-system/tokens';
import { useTheme } from '@/design-system/theme';
import {
  BatteryGauge,
  LiveGraph,
  SignalBars,
  StorageBar,
  ThermalGauge,
} from '@/design-system/visuals';
import { useAccelerometerPreview } from '@/features/dashboard/hooks/use-accelerometer-preview';
import { TileHeader, tileAccentColor } from '@/features/dashboard/components/tile-card';
import type {
  DashboardTileDefinition,
  DashboardTileId,
} from '@/features/dashboard/services/dashboard-tiles';
import type {
  ConnectivityState,
  DashboardInventory,
  DashboardSummary,
} from '@/features/dashboard/types';

type Props = {
  id: DashboardTileId;
  definition: DashboardTileDefinition;
  summary: DashboardSummary;
  inventory: DashboardInventory | null;
  cpuHistory: number[];
  memoryHistory: number[];
  /** True for the single leftover tile: same height, horizontal content. */
  wide: boolean;
};

const NOT_AVAILABLE = 'Not available on this device';
/** Large-font scaling is clamped so fixed-height tiles never clip. */
const MAX_FONT_SCALE = 1.3;

export function TileContent({
  id,
  definition,
  summary,
  inventory,
  cpuHistory,
  memoryHistory,
  wide,
}: Props) {
  switch (id) {
    case 'cpu':
      return <CpuTile definition={definition} summary={summary} history={cpuHistory} wide={wide} />;
    case 'memory':
      return (
        <MemoryTile definition={definition} summary={summary} history={memoryHistory} wide={wide} />
      );
    case 'storage':
      return <StorageTile definition={definition} summary={summary} wide={wide} />;
    case 'battery':
      return <BatteryTile definition={definition} summary={summary} wide={wide} />;
    case 'thermal':
      return <ThermalTile definition={definition} summary={summary} wide={wide} />;
    case 'display':
      return <DisplayTile definition={definition} summary={summary} wide={wide} />;
    case 'network':
      return <NetworkTile definition={definition} summary={summary} wide={wide} />;
    case 'sensors':
      return <SensorsTile definition={definition} inventory={inventory} wide={wide} />;
    case 'camera':
      return <CameraTile definition={definition} inventory={inventory} wide={wide} />;
    case 'connectivity':
      return (
        <ConnectivityTile
          definition={definition}
          summary={summary}
          inventory={inventory}
          wide={wide}
        />
      );
    default:
      return null;
  }
}

type TileBodyProps = {
  value: string;
  unit?: string | null;
  visual: ReactNode;
  caption: string | ReactNode;
  wide: boolean;
};

/**
 * The one tile structure every dashboard tile shares: large value, one small
 * visual and one caption under a fixed-height, fixed-width shell. The wide
 * variant keeps the same height and lays the value and visual side by side.
 */
function TileBody({ value, unit, visual, caption, wide }: TileBodyProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.body}>
      <View style={[styles.main, wide && styles.mainWide]}>
        <View style={styles.valueBlock}>
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            maxFontSizeMultiplier={MAX_FONT_SCALE}
            style={[styles.metric, { color: colors.text }]}
          >
            {value}
          </Text>
          {unit ? (
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              maxFontSizeMultiplier={MAX_FONT_SCALE}
              style={[styles.metricUnit, { color: colors.muted }]}
            >
              {unit}
            </Text>
          ) : null}
        </View>
        <View style={[styles.visual, wide && styles.visualWide]}>{visual}</View>
      </View>
      <View style={styles.captionRow}>
        {typeof caption === 'string' ? (
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            maxFontSizeMultiplier={MAX_FONT_SCALE}
            style={[styles.caption, { color: colors.muted }]}
          >
            {caption}
          </Text>
        ) : (
          caption
        )}
      </View>
    </View>
  );
}

type TileProps = {
  definition: DashboardTileDefinition;
  summary: DashboardSummary;
  wide: boolean;
};

function TileFallback({ message, wide }: { message?: string; wide: boolean }) {
  const { colors } = useTheme();
  return (
    <TileBody
      value="—"
      unit={null}
      wide={wide}
      visual={<Icon name="alert" size={24} color={colors.muted} />}
      caption={message ?? 'Not available on this device'}
    />
  );
}

function CpuTile({ definition, summary, history, wide }: TileProps & { history: number[] }) {
  const { colors } = useTheme();
  const { units } = useFormatters();
  const cpu = summary.cpu;
  const averageMhz = cpu.status === 'ok' ? cpu.value.averageMhz : null;
  const useGhz = units.frequency !== 'MHz';
  const target = averageMhz == null ? 0 : useGhz ? averageMhz / 1000 : averageMhz;
  const decimals = useGhz ? 2 : 0;
  const display = useCountUp(target, { decimals });
  const tint = tileAccentColor(definition.accent, colors);
  const value = averageMhz == null ? '—' : `${display.toFixed(decimals)} ${useGhz ? 'GHz' : 'MHz'}`;

  return (
    <>
      <TileHeader
        accent={definition.accent}
        title={definition.title}
        icon={definition.icon}
        trailing={
          cpu.status === 'ok' ? (
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={MAX_FONT_SCALE}
              style={[styles.headerMeta, { color: colors.muted }]}
            >
              {cpu.value.cores} cores
            </Text>
          ) : null
        }
      />
      {cpu.status !== 'ok' ? (
        <TileFallback wide={wide} />
      ) : (
        <TileBody
          wide={wide}
          value={value}
          unit="average clock"
          visual={
            <LiveGraph
              data={history}
              height={44}
              color={tint}
              accessibilityLabel="Average CPU clock history"
            />
          }
          caption={cpu.value.chipset ?? 'Chipset name not reported'}
        />
      )}
    </>
  );
}

function MemoryTile({ definition, summary, history, wide }: TileProps & { history: number[] }) {
  const { colors } = useTheme();
  const formatters = useFormatters();
  const memory = summary.memory;
  const percent = memory.status === 'ok' ? memory.value.percent : null;
  const used = memory.status === 'ok' ? memory.value.usedBytes : null;
  const total = memory.status === 'ok' ? memory.value.totalBytes : null;
  const free = used != null && total != null ? Math.max(0, total - used) : null;

  return (
    <>
      <TileHeader accent={definition.accent} title={definition.title} icon={definition.icon} />
      {memory.status !== 'ok' || percent == null ? (
        <TileFallback wide={wide} />
      ) : (
        <TileBody
          wide={wide}
          value={used != null ? formatters.bytes(used) : '—'}
          unit={total != null ? `of ${formatters.bytes(total)} used` : 'of total —'}
          visual={
            <LiveGraph
              data={history}
              height={44}
              color={colors.violet}
              accessibilityLabel="Memory use history"
            />
          }
          caption={
            free != null
              ? `${Math.round(percent)}% used · ${formatters.bytes(free)} free`
              : `${Math.round(percent)}% used`
          }
        />
      )}
    </>
  );
}

function StorageTile({ definition, summary, wide }: TileProps) {
  const { colors } = useTheme();
  const formatters = useFormatters();
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
        <TileFallback wide={wide} />
      ) : (
        <TileBody
          wide={wide}
          value={`${Math.round(percent)}%`}
          unit="used"
          visual={
            <StorageBar
              segments={[
                {
                  key: 'used',
                  label: 'Used',
                  value: used ?? 0,
                  color: tint,
                  valueLabel: used != null ? formatters.bytes(used) : undefined,
                },
              ]}
              total={total ?? undefined}
              height={16}
              showLegend={false}
            />
          }
          caption={
            used != null && total != null
              ? `${formatters.bytes(used)} of ${formatters.bytes(total)}${
                  free != null ? ` · ${formatters.bytes(free)} free` : ''
                }`
              : 'Used space not reported'
          }
        />
      )}
    </>
  );
}

function BatteryTile({ definition, summary, wide }: TileProps) {
  const { colors } = useTheme();
  const formatters = useFormatters();
  const battery = summary.battery;
  const percent = battery.status === 'ok' ? battery.value.percent : null;
  const charging = battery.status === 'ok' && battery.value.charging;
  const watts = battery.status === 'ok' ? battery.value.watts : null;
  const temperature = battery.status === 'ok' ? battery.value.temperatureC : null;

  return (
    <>
      <TileHeader
        accent={definition.accent}
        title={definition.title}
        icon={definition.icon}
        trailing={charging ? <LivePulse color={colors.good} size={7} /> : null}
      />
      {battery.status !== 'ok' || percent == null ? (
        <TileFallback
          wide={wide}
          message={battery.status === 'ok' ? 'Level not reported' : undefined}
        />
      ) : (
        <TileBody
          wide={wide}
          value={`${percent}%`}
          unit={charging ? 'charging' : 'on battery'}
          visual={
            <BatteryGauge
              value={percent}
              charging={charging}
              width={wide ? 150 : 124}
              height={52}
              compact
              particles
            />
          }
          caption={
            watts != null || temperature != null
              ? [
                  watts != null ? formatters.power(watts, 2) : null,
                  temperature != null ? formatters.temperature(temperature) : null,
                ]
                  .filter((part): part is string => part != null)
                  .join(' · ')
              : 'No power or temperature data'
          }
        />
      )}
    </>
  );
}

function ThermalTile({ definition, summary, wide }: TileProps) {
  const { colors } = useTheme();
  const formatters = useFormatters();
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
  // The gauge draws its own numbers, so it needs the same unit as the value.
  const fahrenheit = formatters.units.temperature === 'F';
  const gaugeValue =
    temperature == null || !fahrenheit ? temperature : celsiusToFahrenheit(temperature);

  return (
    <>
      <TileHeader
        accent={definition.accent}
        title={definition.title}
        icon={definition.icon}
        trailing={
          statusLabel ? (
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={MAX_FONT_SCALE}
              style={[styles.headerMeta, { color: tint }]}
            >
              {statusLabel}
            </Text>
          ) : null
        }
      />
      {temperature == null || gaugeValue == null ? (
        <TileFallback wide={wide} message="Temperature not reported" />
      ) : (
        <TileBody
          wide={wide}
          value={formatters.temperature(temperature)}
          unit="device temperature"
          visual={
            <ThermalGauge
              value={gaugeValue}
              min={fahrenheit ? 86 : 30}
              max={fahrenheit ? 194 : 90}
              size={58}
              thickness={7}
              unit={fahrenheit ? '°F' : '°C'}
              accessibilityLabel="Battery temperature"
            />
          }
          caption={
            loadPercent != null
              ? `Thermal load ${loadPercent}%`
              : (statusLabel ?? 'Thermal load not reported')
          }
        />
      )}
    </>
  );
}

/** Small screen-shaped visual for the display tile. */
function DisplayAspect({ color }: { color: string }) {
  return (
    <View style={[styles.aspect, { borderColor: withAlpha(color, 0.55) }]}>
      <View style={[styles.aspectInner, { backgroundColor: withAlpha(color, 0.16) }]} />
    </View>
  );
}

function DisplayTile({ definition, summary, wide }: TileProps) {
  const { colors } = useTheme();
  const formatters = useFormatters();
  const display = summary.display;
  const refresh = display.status === 'ok' ? display.value.refreshRateHz : null;
  const resolution = display.status === 'ok' ? display.value.resolution : null;
  const diagonal = display.status === 'ok' ? display.value.diagonalInches : null;

  return (
    <>
      <TileHeader accent={definition.accent} title={definition.title} icon={definition.icon} />
      {display.status !== 'ok' ? (
        <TileFallback wide={wide} />
      ) : (
        <TileBody
          wide={wide}
          value={refresh != null ? `${Math.round(refresh)} Hz` : '—'}
          unit="refresh rate"
          visual={<DisplayAspect color={colors.primary} />}
          caption={
            diagonal != null
              ? `${formatters.screenSize(diagonal)}${resolution != null ? ` · ${resolution}` : ''}`
              : (resolution ?? 'Resolution not reported')
          }
        />
      )}
    </>
  );
}

function NetworkTile({ definition, summary, wide }: TileProps) {
  const { colors } = useTheme();
  const network = summary.network;
  const tint = tileAccentColor(definition.accent, colors);
  const name = network.status === 'ok' ? network.value.name : null;
  const connected = network.status === 'ok' && network.value.connected;

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
        <TileFallback wide={wide} />
      ) : (
        <TileBody
          wide={wide}
          value={network.value.typeLabel}
          unit={network.value.signalLabel ?? (connected ? 'connected' : 'offline')}
          visual={
            <SignalBars level={network.value.signalBars} height={18} barWidth={5} color={tint} />
          }
          caption={
            name != null ? (
              <SensitiveValue
                value={name}
                copyLabel="Network name"
                numberOfLines={1}
                ellipsizeMode="tail"
                maxFontSizeMultiplier={MAX_FONT_SCALE}
                style={[styles.caption, { color: colors.muted }]}
              />
            ) : (
              (network.value.detail ?? (connected ? 'Name hidden by Android' : 'No active network'))
            )
          }
        />
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
    transform: [{ translateX: x.value * 14 }, { translateY: y.value * 14 }],
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
  inventory,
  wide,
}: Omit<TileProps, 'summary'> & {
  inventory: DashboardInventory | null;
}) {
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
        <TileBody
          wide={wide}
          value="…"
          unit="sensors"
          visual={<Icon name="refresh" size={24} color={colors.muted} />}
          caption="Reading sensors…"
        />
      ) : sensors?.status !== 'ok' ? (
        <TileFallback wide={wide} message="Sensor list not available" />
      ) : (
        <TileBody
          wide={wide}
          value={String(sensors.value.count)}
          unit="sensors reported"
          visual={
            <AccelerometerOrb
              x={accelerometer.x}
              y={accelerometer.y}
              active={accelerometer.streaming}
              color={tint}
            />
          }
          caption={
            accelerometer.streaming
              ? 'Live tilt preview'
              : accelerometer.available
                ? 'Tilt preview paused'
                : 'No accelerometer reported'
          }
        />
      )}
    </>
  );
}

function CameraLenses({
  back,
  front,
  tint,
  muted,
}: {
  back: number;
  front: number;
  tint: string;
  muted: string;
}) {
  const total = Math.max(1, back + front);
  return (
    <View style={styles.lenses}>
      {Array.from({ length: total }, (_, index) => {
        const isBack = index < back;
        return (
          <View
            key={index}
            style={[
              styles.lens,
              {
                borderColor: withAlpha(isBack ? tint : muted, 0.6),
                backgroundColor: isBack ? withAlpha(tint, 0.22) : 'transparent',
              },
            ]}
          />
        );
      })}
    </View>
  );
}

function CameraTile({
  definition,
  inventory,
  wide,
}: Omit<TileProps, 'summary'> & {
  inventory: DashboardInventory | null;
}) {
  const { colors } = useTheme();
  const cameras = inventory?.cameras ?? null;
  const tint = tileAccentColor(definition.accent, colors);

  return (
    <>
      <TileHeader accent={definition.accent} title={definition.title} icon={definition.icon} />
      {inventory == null ? (
        <TileBody
          wide={wide}
          value="…"
          unit="lenses"
          visual={<Icon name="refresh" size={24} color={colors.muted} />}
          caption="Reading cameras…"
        />
      ) : cameras?.status !== 'ok' ? (
        <TileFallback wide={wide} message="Camera list not available" />
      ) : (
        <TileBody
          wide={wide}
          value={String(cameras.value.lensCount)}
          unit="lenses"
          visual={
            <CameraLenses
              back={cameras.value.back}
              front={cameras.value.front}
              tint={tint}
              muted={colors.muted}
            />
          }
          caption={`${cameras.value.back} back · ${cameras.value.front} front`}
        />
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

function ConnectivityBadge({ icon, label, stateLabel, active, tint }: ConnectivityEntryProps) {
  const { colors } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${stateLabel}`}
      style={[
        styles.badge,
        {
          backgroundColor: withAlpha(active ? tint : colors.muted, 0.1),
          borderColor: withAlpha(active ? tint : colors.muted, 0.22),
        },
      ]}
    >
      <Icon name={icon} size={16} color={active ? tint : colors.muted} />
    </View>
  );
}

function ConnectivityTile({
  definition,
  summary,
  inventory,
  wide,
}: TileProps & {
  inventory: DashboardInventory | null;
}) {
  const { colors } = useTheme();
  const connectivity = summary.connectivity;
  const bluetooth = connectivity.status === 'ok' ? connectivity.value.bluetooth : 'unknown';
  const nfc = connectivity.status === 'ok' ? connectivity.value.nfc : 'unknown';
  const uwb = inventory?.uwb ?? (connectivity.status === 'ok' ? connectivity.value.uwb : 'unknown');
  const uwbActive = uwb === 'supported';
  const activeCount =
    [bluetooth, nfc].filter((state) => state === 'on').length + (uwbActive ? 1 : 0);
  const tint = tileAccentColor(definition.accent, colors);

  return (
    <>
      <TileHeader accent={definition.accent} title={definition.title} icon={definition.icon} />
      <TileBody
        wide={wide}
        value={String(activeCount)}
        unit="of 3 radios on"
        visual={
          <View style={styles.badgeRow}>
            <ConnectivityBadge
              icon="bluetooth"
              label="Bluetooth"
              stateLabel={CONNECTIVITY_LABELS[bluetooth]}
              active={bluetooth === 'on'}
              tint={tint}
            />
            <ConnectivityBadge
              icon="nfc"
              label="NFC"
              stateLabel={CONNECTIVITY_LABELS[nfc]}
              active={nfc === 'on'}
              tint={colors.violet}
            />
            <ConnectivityBadge
              icon="sensors"
              label="UWB"
              stateLabel={
                uwbActive ? 'Supported' : uwb === 'unavailable' ? 'Not on device' : 'Unknown'
              }
              active={uwbActive}
              tint={colors.primary}
            />
          </View>
        }
        caption={[
          `Bluetooth ${CONNECTIVITY_LABELS[bluetooth]}`,
          `NFC ${CONNECTIVITY_LABELS[nfc]}`,
          `UWB ${uwbActive ? 'Supported' : 'No'}`,
        ].join(' · ')}
      />
    </>
  );
}

function connectivityLabel(state: ConnectivityState): string {
  switch (state) {
    case 'on':
      return 'On';
    case 'off':
      return 'Off';
    case 'permission':
      return 'Permission needed';
    case 'unavailable':
      return 'No radio';
    default:
      return 'Unknown';
  }
}

export type TileCopyOptions = {
  /** When false the network name is replaced with "Hidden". */
  includeSensitive?: boolean;
  /** The units to print in; defaults to the active (stored) choices. */
  units?: ResolvedUnits;
};

/** Plain-text summary of a tile, used by the long-press copy action. */
export function tileCopySummary(
  id: DashboardTileId,
  summary: DashboardSummary,
  inventory: DashboardInventory | null,
  options: TileCopyOptions = {},
): string {
  const { includeSensitive = true, units = getActiveUnits() } = options;

  switch (id) {
    case 'cpu': {
      const cpu = summary.cpu;
      if (cpu.status !== 'ok') return `CPU: ${NOT_AVAILABLE}`;
      return [
        `Average clock: ${
          cpu.value.averageMhz != null
            ? formatFrequencyKhz(cpu.value.averageMhz * 1000, units.frequency)
            : NOT_AVAILABLE
        }`,
        `Max clock: ${
          cpu.value.maxMhz != null
            ? formatFrequencyKhz(cpu.value.maxMhz * 1000, units.frequency)
            : 'Hidden'
        }`,
        `Cores: ${cpu.value.cores}`,
        `Chipset: ${cpu.value.chipset ?? NOT_AVAILABLE}`,
      ].join(' · ');
    }
    case 'memory': {
      const memory = summary.memory;
      if (memory.status !== 'ok') return `Memory: ${NOT_AVAILABLE}`;
      return `${Math.round(memory.value.percent)}% used`;
    }
    case 'storage': {
      const storage = summary.storage;
      if (storage.status !== 'ok') return `Storage: ${NOT_AVAILABLE}`;
      return `${Math.round(storage.value.percent)}% used`;
    }
    case 'battery': {
      const battery = summary.battery;
      if (battery.status !== 'ok') return `Battery: ${NOT_AVAILABLE}`;
      return [
        `Level: ${battery.value.percent == null ? NOT_AVAILABLE : `${battery.value.percent}%`}`,
        `State: ${battery.value.charging ? 'Charging' : 'On battery'}`,
        `Power: ${
          battery.value.watts == null
            ? NOT_AVAILABLE
            : formatPower(battery.value.watts, units.power, 2)
        }`,
        `Temperature: ${
          battery.value.temperatureC == null
            ? NOT_AVAILABLE
            : formatTemperature(battery.value.temperatureC, units.temperature, 0)
        }`,
      ].join(' · ');
    }
    case 'thermal': {
      const thermal = summary.thermal;
      if (thermal.status !== 'ok') return `Thermal: ${NOT_AVAILABLE}`;
      return [
        `Temperature: ${
          thermal.value.temperatureC == null
            ? NOT_AVAILABLE
            : formatTemperature(thermal.value.temperatureC, units.temperature, 0)
        }`,
        `Status: ${thermal.value.statusLabel ?? NOT_AVAILABLE}`,
        `Load: ${thermal.value.loadPercent == null ? NOT_AVAILABLE : `${thermal.value.loadPercent}%`}`,
      ].join(' · ');
    }
    case 'display': {
      const display = summary.display;
      if (display.status !== 'ok') return `Display: ${NOT_AVAILABLE}`;
      return [
        `Resolution: ${display.value.resolution ?? NOT_AVAILABLE}`,
        `Refresh rate: ${
          display.value.refreshRateHz == null
            ? NOT_AVAILABLE
            : `${Math.round(display.value.refreshRateHz)} Hz`
        }`,
        `Panel: ${
          display.value.diagonalInches == null
            ? NOT_AVAILABLE
            : formatScreenSize(display.value.diagonalInches, units.screenSize)
        }`,
      ].join(' · ');
    }
    case 'network': {
      const network = summary.network;
      if (network.status !== 'ok') return `Network: ${NOT_AVAILABLE}`;
      const name =
        network.value.name == null
          ? network.value.connected
            ? 'Hidden'
            : 'No active network'
          : includeSensitive
            ? network.value.name
            : 'Hidden';
      return [
        network.value.typeLabel,
        `Name: ${name}`,
        `Detail: ${network.value.detail ?? network.value.signalLabel ?? NOT_AVAILABLE}`,
      ].join(' · ');
    }
    case 'sensors': {
      const sensors = inventory?.sensors;
      return sensors?.status === 'ok'
        ? `${sensors.value.count} sensors reported`
        : `Sensors: ${NOT_AVAILABLE}`;
    }
    case 'camera': {
      const cameras = inventory?.cameras;
      return cameras?.status === 'ok'
        ? `${cameras.value.lensCount} lenses · ${cameras.value.back} back · ${cameras.value.front} front`
        : `Cameras: ${NOT_AVAILABLE}`;
    }
    case 'connectivity': {
      const connectivity = summary.connectivity;
      if (connectivity.status !== 'ok') return `Connectivity: ${NOT_AVAILABLE}`;
      return [
        `Bluetooth: ${connectivityLabel(connectivity.value.bluetooth)}`,
        `NFC: ${connectivityLabel(connectivity.value.nfc)}`,
        `UWB: ${inventory?.uwb === 'supported' ? 'Supported' : 'Not supported'}`,
      ].join(' · ');
    }
    default:
      return NOT_AVAILABLE;
  }
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    gap: spacing.sm,
  },
  main: {
    gap: spacing.xs,
  },
  mainWide: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  valueBlock: {
    flexShrink: 1,
  },
  metric: {
    ...typography.display,
    fontVariant: ['tabular-nums'],
    lineHeight: 38,
  },
  metricUnit: {
    ...typography.caption,
    marginTop: -2,
  },
  visual: {
    flex: 1,
    minHeight: 40,
    justifyContent: 'center',
  },
  visualWide: {
    flex: 0,
    width: 150,
    alignItems: 'flex-end',
  },
  captionRow: {
    marginTop: 'auto',
  },
  caption: {
    ...typography.caption,
  },
  headerMeta: {
    ...typography.caption,
    fontFamily: 'Inter_600SemiBold',
  },
  aspect: {
    width: 92,
    height: 44,
    borderRadius: 8,
    borderWidth: 2,
    padding: 4,
    justifyContent: 'center',
  },
  aspectInner: {
    flex: 1,
    borderRadius: 4,
  },
  orb: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbRing: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
  },
  orbDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  lenses: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
    maxWidth: 110,
  },
  lens: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  badge: {
    width: 34,
    height: 34,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
