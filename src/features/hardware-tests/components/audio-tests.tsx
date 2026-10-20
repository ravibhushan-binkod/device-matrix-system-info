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

import { Button, Card, Chip } from '@/design-system/components';
import { withAlpha } from '@/design-system/color';
import { Icon } from '@/design-system/icon';
import { useTheme } from '@/design-system/theme';
import { spacing, typography } from '@/design-system/tokens';
import { failureMessage } from '@/core/result';
import { useToneTest } from '@/features/hardware-tests/hooks/use-tone-test';
import { audioOutputLabel } from '@/features/hardware-tests/services/test-logic';

type Props = { onUnavailable: (reason: string | null) => void };

function WaveBar({ active, index, color }: { active: boolean; index: number; color: string }) {
  const reduced = useReducedMotion();
  const level = useSharedValue(0.18);

  useEffect(() => {
    if (!active) {
      cancelAnimation(level);
      level.value = 0.18;
      return;
    }
    if (reduced) {
      level.value = 0.7;
      return;
    }
    level.value = withRepeat(withTiming(1, { duration: 360 + index * 90 }), -1, true);
    return () => cancelAnimation(level);
  }, [active, index, level, reduced]);

  const style = useAnimatedStyle(() => ({
    height: 14 + level.value * 62,
  }));

  return <Animated.View style={[styles.bar, { backgroundColor: color }, style]} />;
}

function ToneStage({ playing, color }: { playing: boolean; color: string }) {
  return (
    <View style={styles.stage}>
      <View style={[styles.speakerCircle, { backgroundColor: withAlpha(color, 0.12) }]}>
        <Icon name="speaker" size={60} color={color} />
      </View>
      <View style={styles.waveRow} accessibilityElementsHidden>
        {[0, 1, 2, 3, 4].map((index) => (
          <WaveBar key={index} active={playing} index={index} color={color} />
        ))}
      </View>
    </View>
  );
}

export function LoudspeakerTest({ onUnavailable }: Props) {
  const { colors } = useTheme();
  const { playing, channel, output, notice, play, stop } = useToneTest('speaker');

  useEffect(() => {
    if (output?.status === 'unavailable') onUnavailable(output.reason);
    else onUnavailable(null);
  }, [onUnavailable, output]);

  const start = (next: 'left' | 'right' | 'both') => {
    const result = play(next);
    if (result.status !== 'ok') onUnavailable(failureMessage(result));
  };

  return (
    <Card style={styles.card}>
      <ToneStage playing={playing} color={colors.accent} />
      <Text style={[styles.state, { color: colors.text }]}>
        {playing ? `Playing ${channel === 'both' ? 'both sides' : channel}` : 'Tone stopped'}
      </Text>
      <View style={styles.chips}>
        <Chip label="Left" selected={playing && channel === 'left'} onPress={() => start('left')} />
        <Chip
          label="Right"
          selected={playing && channel === 'right'}
          onPress={() => start('right')}
        />
        <Chip label="Both" selected={playing && channel === 'both'} onPress={() => start('both')} />
      </View>
      <Button
        title={playing ? 'Stop tone' : 'Play both sides'}
        icon={playing ? 'pause' : 'play'}
        onPress={playing ? stop : () => start('both')}
        disabled={output?.status === 'unavailable'}
      />
      <View style={[styles.outputRow, { borderColor: colors.border }]}>
        <Icon name="speaker" size={16} color={colors.muted} />
        <Text style={[styles.outputText, { color: colors.muted }]}>
          {output?.status === 'ok'
            ? `Current output: ${audioOutputLabel(output.value.route)}`
            : 'Audio route unavailable'}
        </Text>
      </View>
      {notice ? <Text style={[styles.notice, { color: colors.warning }]}>{notice}</Text> : null}
    </Card>
  );
}

export function EarpieceTest({ onUnavailable }: Props) {
  const { colors } = useTheme();
  const { playing, output, notice, play, stop } = useToneTest('earpiece');

  useEffect(() => {
    if (output?.status === 'unavailable') {
      onUnavailable(output.reason);
      return;
    }
    if (output?.status === 'ok' && !output.value.earpieceAvailable) {
      onUnavailable('This device does not report a built-in earpiece.');
      return;
    }
    onUnavailable(null);
  }, [onUnavailable, output]);

  const start = () => {
    const result = play('both');
    if (result.status !== 'ok') onUnavailable(failureMessage(result));
  };
  const toneDisabled =
    output?.status === 'unavailable' ||
    (output?.status === 'ok' && !output.value.earpieceAvailable);

  return (
    <Card style={styles.card}>
      <ToneStage playing={playing} color={colors.violet} />
      <Text style={[styles.state, { color: colors.text }]}>
        {playing ? 'Tone playing in the earpiece' : 'Ready — hold the phone to your ear'}
      </Text>
      <Button
        title={playing ? 'Stop tone' : 'Play earpiece tone'}
        icon={playing ? 'pause' : 'play'}
        onPress={playing ? stop : start}
        disabled={toneDisabled}
      />
      <View style={[styles.outputRow, { borderColor: colors.border }]}>
        <Icon name="earpiece" size={16} color={colors.muted} />
        <Text style={[styles.outputText, { color: colors.muted }]}>
          {output?.status === 'ok'
            ? output.value.earpieceAvailable
              ? 'Earpiece reported by Android'
              : 'Earpiece not reported'
            : 'Audio route unavailable'}
        </Text>
      </View>
      <Text style={[styles.hint, { color: colors.muted }]}>
        The tone uses Android’s communication mode and the previous audio settings are restored when
        it stops.
      </Text>
      {notice ? <Text style={[styles.notice, { color: colors.warning }]}>{notice}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  stage: {
    height: 190,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  speakerCircle: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveRow: {
    height: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  bar: {
    width: 8,
    borderRadius: 4,
  },
  state: {
    ...typography.body,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
  },
  chips: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  outputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.md,
  },
  outputText: {
    ...typography.caption,
    flex: 1,
  },
  hint: {
    ...typography.caption,
    lineHeight: 18,
  },
  notice: {
    ...typography.caption,
    lineHeight: 18,
    textAlign: 'center',
  },
});
