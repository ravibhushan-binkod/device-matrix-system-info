import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  addVolumeKeyListener,
  startVolumeKeyCapture,
  stopVolumeKeyCapture,
  type VolumeKeyDirection,
} from '@/core/native';
import { failureMessage } from '@/core/result';
import { Button, Card } from '@/design-system/components';
import { withAlpha } from '@/design-system/color';
import { Icon } from '@/design-system/icon';
import { useTheme } from '@/design-system/theme';
import { spacing, typography } from '@/design-system/tokens';

type Props = { onUnavailable: (reason: string | null) => void };

/**
 * Volume-button check. The native window callback watches key events only
 * while this screen is focused and always passes the event on, so the phone's
 * volume still changes normally. It does not consume keys and needs no extra
 * dependency or special access.
 */
export function VolumeButtonTest({ onUnavailable }: Props) {
  const { colors } = useTheme();
  const [seen, setSeen] = useState<Record<VolumeKeyDirection, boolean>>({
    up: false,
    down: false,
  });
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      const capture = startVolumeKeyCapture();
      if (capture.status !== 'ok') {
        const reason = failureMessage(capture);
        setError(reason);
        onUnavailable(reason);
        return () => stopVolumeKeyCapture();
      }

      setError(null);
      onUnavailable(null);
      const remove = addVolumeKeyListener((direction) => {
        setSeen((previous) =>
          previous[direction] ? previous : { ...previous, [direction]: true },
        );
      });
      return () => {
        remove();
        stopVolumeKeyCapture();
      };
    }, [onUnavailable]),
  );

  const reset = () => {
    setSeen({ up: false, down: false });
  };

  const bothSeen = seen.up && seen.down;

  return (
    <Card style={styles.card}>
      <Text style={[styles.heading, { color: colors.text }]}>
        {bothSeen
          ? 'Both volume buttons work'
          : seen.up
            ? 'Volume up detected — try volume down'
            : seen.down
              ? 'Volume down detected — try volume up'
              : 'Press volume up, then volume down'}
      </Text>

      <View style={styles.keys}>
        <View
          style={[
            styles.key,
            {
              borderColor: seen.up ? colors.good : colors.border,
              backgroundColor: seen.up ? withAlpha(colors.good, 0.12) : colors.surface2,
            },
          ]}
        >
          <Icon name="plus" size={24} color={seen.up ? colors.good : colors.muted} />
          <Text style={[styles.keyLabel, { color: seen.up ? colors.good : colors.muted }]}>
            Volume up
          </Text>
          <Text style={[styles.keyState, { color: colors.muted }]}>
            {seen.up ? 'Detected' : 'Waiting'}
          </Text>
        </View>

        <View
          style={[
            styles.key,
            {
              borderColor: seen.down ? colors.good : colors.border,
              backgroundColor: seen.down ? withAlpha(colors.good, 0.12) : colors.surface2,
            },
          ]}
        >
          <Icon name="minus" size={24} color={seen.down ? colors.good : colors.muted} />
          <Text style={[styles.keyLabel, { color: seen.down ? colors.good : colors.muted }]}>
            Volume down
          </Text>
          <Text style={[styles.keyState, { color: colors.muted }]}>
            {seen.down ? 'Detected' : 'Waiting'}
          </Text>
        </View>
      </View>

      <Button title="Check again" variant="secondary" icon="refresh" onPress={reset} />

      {error ? (
        <Text style={[styles.notice, { color: colors.warning }]}>{error}</Text>
      ) : (
        <Text style={[styles.note, { color: colors.muted }]}>
          The buttons keep their normal volume behaviour while this screen is active. They are only
          watched here, never blocked or changed.
        </Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
  },
  heading: {
    ...typography.title,
    textAlign: 'center',
  },
  keys: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  key: {
    flex: 1,
    minHeight: 150,
    borderWidth: 1,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  keyLabel: {
    ...typography.body,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
  },
  keyState: {
    ...typography.caption,
  },
  note: {
    ...typography.caption,
    lineHeight: 18,
    textAlign: 'center',
  },
  notice: {
    ...typography.caption,
    lineHeight: 18,
    textAlign: 'center',
  },
});
