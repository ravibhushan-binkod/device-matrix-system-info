import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import type { Result } from '@/core/result';
import { formatBytes } from '@/core/utils/format-bytes';
import { PressableScale } from '@/design-system/animations/pressable-scale';
import { Card } from '@/design-system/components';
import { copyValue } from '@/design-system/copy/copy-value';
import { Icon } from '@/design-system/icon';
import { useTheme } from '@/design-system/theme';
import { spacing, typography } from '@/design-system/tokens';
import { Ring } from '@/design-system/visuals';
import { batteryRingColor } from '@/features/dashboard/services/dashboard-service';
import type { BatteryOverview, UsageOverview } from '@/features/dashboard/types';

type Props = {
  memory: Result<UsageOverview>;
  storage: Result<UsageOverview>;
  battery: Result<BatteryOverview>;
  onOpenMemory: () => void;
  onOpenStorage: () => void;
  onOpenBattery: () => void;
};

const MIN_SIZE = 72;
const MAX_SIZE = 104;
const GAP = spacing.sm;

/** Three live rings — RAM, storage and battery — that open their detail screens. */
export function OverviewRings({
  memory,
  storage,
  battery,
  onOpenMemory,
  onOpenStorage,
  onOpenBattery,
}: Props) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const fit = (width - 2 * spacing.lg - 2 * spacing.lg - 2 * GAP) / 3;
  const size = Math.round(Math.min(MAX_SIZE, Math.max(MIN_SIZE, fit)));
  const thickness = Math.max(8, Math.round(size * 0.11));

  const freeCaption = (result: Result<UsageOverview>) =>
    result.status === 'ok'
      ? `${formatBytes(result.value.totalBytes - result.value.usedBytes, { style: 'decimal' })} free`
      : null;

  const memoryCaption = freeCaption(memory);
  const storageCaption = freeCaption(storage);
  const batteryCaption =
    battery.status === 'ok'
      ? battery.value.percent == null
        ? null
        : battery.value.charging
          ? 'Charging'
          : battery.value.plugged
            ? 'Plugged in'
            : 'On battery'
      : null;

  return (
    <Card>
      <View style={[styles.row, { gap: GAP }]}>
        {memory.status === 'ok' && memoryCaption ? (
          <RingTile
            label="RAM"
            value={memory.value.percent}
            caption={memoryCaption}
            size={size}
            thickness={thickness}
            onPress={onOpenMemory}
          />
        ) : (
          <UnavailableTile size={size} />
        )}

        {storage.status === 'ok' && storageCaption ? (
          <RingTile
            label="Storage"
            value={storage.value.percent}
            caption={storageCaption}
            size={size}
            thickness={thickness}
            onPress={onOpenStorage}
          />
        ) : (
          <UnavailableTile size={size} />
        )}

        {battery.status === 'ok' && battery.value.percent != null && batteryCaption ? (
          <RingTile
            label="Battery"
            value={battery.value.percent}
            caption={batteryCaption}
            size={size}
            thickness={thickness}
            color={batteryRingColor(battery.value.percent, battery.value.charging, colors)}
            onPress={onOpenBattery}
          />
        ) : (
          <UnavailableTile size={size} />
        )}
      </View>
    </Card>
  );
}

type RingTileProps = {
  label: string;
  /** 0..100. */
  value: number;
  caption: string;
  size: number;
  thickness: number;
  color?: string;
  onPress: () => void;
};

function RingTile({ label, value, caption, size, thickness, color, onPress }: RingTileProps) {
  const { colors } = useTheme();

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`Open ${label} details`}
      accessibilityHint="Long press to copy the reading"
      onPress={onPress}
      onLongPress={() => void copyValue(`${label}: ${value}% · ${caption}`, label)}
      delayLongPress={320}
      style={styles.tile}
    >
      <Ring value={value} max={100} label={label} size={size} thickness={thickness} color={color} />
      <Text numberOfLines={2} style={[styles.caption, { color: colors.muted }]}>
        {caption}
      </Text>
    </PressableScale>
  );
}

function UnavailableTile({ size }: { size: number }) {
  const { colors } = useTheme();

  return (
    <View style={styles.tile}>
      <View
        style={[
          styles.placeholder,
          { width: size, height: size, borderRadius: size / 2, borderColor: colors.border },
        ]}
      >
        <Icon name="alert" size={20} color={colors.muted} />
      </View>
      <Text numberOfLines={3} style={[styles.caption, { color: colors.muted }]}>
        Not available on this device
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tile: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  placeholder: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caption: {
    ...typography.caption,
    textAlign: 'center',
  },
});
