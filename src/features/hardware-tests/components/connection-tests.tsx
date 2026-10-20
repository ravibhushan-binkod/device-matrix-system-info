import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Button, Card, Chip, PermissionBanner } from '@/design-system/components';
import { withAlpha } from '@/design-system/color';
import { Icon } from '@/design-system/icon';
import { useTheme } from '@/design-system/theme';
import { spacing, typography } from '@/design-system/tokens';
import { openAppSettings } from '@/core/permissions';
import { useBluetoothTest } from '@/features/hardware-tests/hooks/use-bluetooth-test';
import { useChargingTest } from '@/features/hardware-tests/hooks/use-charging-test';
import { useHeadsetTest } from '@/features/hardware-tests/hooks/use-headset-test';
import { audioOutputLabel, isHeadsetRoute } from '@/features/hardware-tests/services/test-logic';
import type { BatteryReading } from '@/core/native';

type Props = { onUnavailable: (reason: string | null) => void };

const PLUG_LABELS: Record<string, string> = {
  ac: 'AC charger',
  usb: 'USB charger',
  wireless: 'Wireless charger',
  dock: 'Dock',
  none: 'Not plugged in',
  unknown: 'Plug state unknown',
};

const STATUS_LABELS: Record<string, string> = {
  charging: 'Charging',
  discharging: 'Discharging',
  full: 'Full',
  'not-charging': 'Not charging',
  unknown: 'Unknown',
};

function batteryLabel(reading: BatteryReading): string {
  return `${reading.percent ?? reading.level}%`;
}

export function ChargingTest({ onUnavailable }: Props) {
  const { colors } = useTheme();
  const { reading, seenPlugged, seenUnplugged, plugged } = useChargingTest();
  const reduced = useReducedMotion();
  const pulse = useSharedValue(0.3);

  useEffect(() => {
    if (!reading) return;
    onUnavailable(
      reading.status === 'ok'
        ? null
        : reading.status === 'denied'
          ? `Permission needed: ${reading.permission}`
          : reading.reason,
    );
  }, [onUnavailable, reading]);

  useEffect(() => {
    if (!plugged || reduced) {
      cancelAnimation(pulse);
      pulse.value = 0.35;
      return;
    }
    pulse.value = withRepeat(withTiming(1, { duration: 1_000 }), -1, true);
    return () => cancelAnimation(pulse);
  }, [plugged, pulse, reduced]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.15 + pulse.value * 0.28,
    transform: [{ scale: 0.92 + pulse.value * 0.15 }],
  }));

  const value = reading?.status === 'ok' ? reading.value : null;

  return (
    <Card style={styles.card}>
      <View style={styles.chargingStage}>
        {plugged ? (
          <Animated.View
            style={[styles.chargeGlow, { backgroundColor: withAlpha(colors.good, 0.6) }, glowStyle]}
          />
        ) : null}
        <View
          style={[
            styles.batteryCircle,
            {
              backgroundColor: withAlpha(plugged ? colors.good : colors.muted, 0.12),
            },
          ]}
        >
          <Icon name="charging" size={60} color={plugged ? colors.good : colors.muted} />
        </View>
        <Text style={[styles.bigValue, { color: colors.text }]}>
          {value ? batteryLabel(value) : 'Waiting'}
        </Text>
        <Text style={[styles.stateHint, { color: colors.muted }]}>
          {value
            ? `${STATUS_LABELS[value.status] ?? value.status} · ${PLUG_LABELS[value.plugged] ?? value.plugged}`
            : 'Reading the battery state…'}
        </Text>
      </View>
      <View style={styles.chargingChecks}>
        <Chip label="Charging seen" icon={seenPlugged ? 'check' : 'minus'} selected={seenPlugged} />
        <Chip
          label="Unplugged seen"
          icon={seenUnplugged ? 'check' : 'minus'}
          selected={seenUnplugged}
        />
      </View>
      <Text style={[styles.hint, { color: colors.muted }]}>
        Plug in a charger, then unplug it. Both states need to be seen; Android reports the change
        through the battery broadcast.
      </Text>
    </Card>
  );
}

export function HeadsetTest({ onUnavailable }: Props) {
  const { colors } = useTheme();
  const { output, isPolling } = useHeadsetTest();
  const value = output?.status === 'ok' ? output.value : null;
  const connected = value ? isHeadsetRoute(value.route) : false;

  useEffect(() => {
    if (output?.status === 'unavailable') onUnavailable(output.reason);
    else if (output?.status === 'ok') onUnavailable(null);
  }, [onUnavailable, output]);

  return (
    <Card style={styles.card}>
      <View style={styles.headsetStage}>
        <View
          style={[
            styles.headsetCircle,
            { backgroundColor: withAlpha(connected ? colors.good : colors.muted, 0.12) },
          ]}
        >
          <Icon name="headphones" size={60} color={connected ? colors.good : colors.muted} />
        </View>
        <Text style={[styles.bigValue, { color: colors.text }]}>
          {connected ? audioOutputLabel(value?.route ?? 'unknown') : 'No headset'}
        </Text>
        <Text style={[styles.stateHint, { color: colors.muted }]}>
          {isPolling
            ? 'Watching Android audio outputs…'
            : 'Polling pauses while this screen is in the background'}
        </Text>
      </View>
      <View style={styles.headsetChecks}>
        <Chip
          label="Wired headset"
          icon={value?.headsetConnected ? 'check' : 'minus'}
          selected={value?.headsetConnected ?? false}
        />
        <Chip
          label="USB audio"
          icon={value?.usbAudioConnected ? 'check' : 'minus'}
          selected={value?.usbAudioConnected ?? false}
        />
      </View>
      {value && value.devices.length > 0 ? (
        <View style={[styles.deviceList, { borderColor: colors.border }]}>
          <Text style={[styles.deviceLabel, { color: colors.muted }]}>Connected outputs</Text>
          <Text style={[styles.deviceText, { color: colors.text }]}>
            {value.devices.join(' · ')}
          </Text>
        </View>
      ) : null}
      <Text style={[styles.hint, { color: colors.muted }]}>
        Plug in wired headphones or a USB audio device. Bluetooth audio can be connected too, but
        this check is for the wired and USB ports.
      </Text>
    </Card>
  );
}

export function BluetoothTest({ onUnavailable }: Props) {
  const { colors } = useTheme();
  const { permission, info, notice, openBluetoothSettings } = useBluetoothTest();
  const value = info?.status === 'ok' ? info.value : null;

  useEffect(() => {
    if (permission.state === 'checking') return;
    if (!permission.granted) {
      onUnavailable(
        'Allow the Nearby devices permission to read the Bluetooth state on Android 12 and newer.',
      );
      return;
    }
    if (info?.status === 'unavailable') {
      onUnavailable(info.reason);
      return;
    }
    if (value && !value.present) {
      onUnavailable('This device does not report Bluetooth hardware.');
      return;
    }
    onUnavailable(null);
  }, [info, onUnavailable, permission.granted, permission.state, value]);

  const allowed = permission.granted;
  const enabled = value?.enabled === true;

  return (
    <Card style={styles.card}>
      <View style={styles.bluetoothStage}>
        <View
          style={[
            styles.bluetoothCircle,
            { backgroundColor: withAlpha(enabled ? colors.primary : colors.muted, 0.12) },
          ]}
        >
          <Icon name="bluetooth" size={60} color={enabled ? colors.primary : colors.muted} />
        </View>
        <Text style={[styles.bigValue, { color: colors.text }]}>
          {!allowed
            ? 'Permission needed'
            : value
              ? enabled
                ? 'Bluetooth on'
                : 'Bluetooth off'
              : 'Checking…'}
        </Text>
        <Text style={[styles.stateHint, { color: colors.muted }]}>
          {enabled
            ? 'Android reports the adapter is on and readable.'
            : allowed
              ? 'Turn Bluetooth on in system settings to confirm that the adapter works.'
              : 'The Nearby devices permission is required for this reading.'}
        </Text>
      </View>

      {!allowed ? (
        <PermissionBanner
          title="Nearby devices permission"
          message="Android 12 and newer hide the Bluetooth state from apps without this permission. It is used only while the check is open."
          actionLabel={permission.canAskAgain ? 'Allow' : 'Open app settings'}
          onAction={() => {
            if (permission.canAskAgain) void permission.request();
            else openAppSettings();
          }}
        />
      ) : null}

      {allowed ? (
        <Button
          title="Open Bluetooth settings"
          variant="secondary"
          icon="bluetooth"
          onPress={openBluetoothSettings}
        />
      ) : null}

      {notice ? <Text style={[styles.notice, { color: colors.warning }]}>{notice}</Text> : null}
      <Text style={[styles.hint, { color: colors.muted }]}>
        This test never changes Bluetooth itself. Android requires a system settings trip to turn it
        on or off.
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  chargingStage: {
    minHeight: 215,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  chargeGlow: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
  },
  batteryCircle: {
    width: 126,
    height: 126,
    borderRadius: 63,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigValue: {
    ...typography.title,
    fontSize: 24,
    lineHeight: 30,
    textAlign: 'center',
  },
  stateHint: {
    ...typography.caption,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 18,
  },
  chargingChecks: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  headsetStage: {
    minHeight: 210,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  headsetCircle: {
    width: 126,
    height: 126,
    borderRadius: 63,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headsetChecks: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  deviceList: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.md,
    gap: 2,
  },
  deviceLabel: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  deviceText: {
    ...typography.caption,
    lineHeight: 18,
  },
  bluetoothStage: {
    minHeight: 210,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  bluetoothCircle: {
    width: 126,
    height: 126,
    borderRadius: 63,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    ...typography.caption,
    lineHeight: 18,
  },
  notice: {
    ...typography.caption,
    lineHeight: 18,
  },
});
