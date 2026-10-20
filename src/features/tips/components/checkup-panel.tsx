import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useMotionPreference } from '@/design-system/animations/use-motion-preference';

import { Button, Card } from '@/design-system/components';
import { withAlpha } from '@/design-system/color';
import { Icon } from '@/design-system/icon';
import { useTheme } from '@/design-system/theme';
import { radius, spacing, typography } from '@/design-system/tokens';

/** The start card: what the check-up does and the button that runs it. */
export function CheckupIntro({ onRun }: { onRun: () => void }) {
  const { colors } = useTheme();

  return (
    <Card style={styles.card}>
      <View style={[styles.badge, { backgroundColor: withAlpha(colors.accent, 0.14) }]}>
        <Icon name="tips" size={24} color={colors.accent} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>Run a check-up</Text>
      <Text style={[styles.body, { color: colors.muted }]}>
        Device Matrix reads storage, memory, battery, display, Wi-Fi and system settings on this
        phone and lists what is worth fixing. Nothing leaves the device.
      </Text>
      <Button title="Run check-up" icon="search" onPress={onRun} />
    </Card>
  );
}

/** The scan animation while the rules run (two pulsing rings around the icon). */
export function CheckupAnimation() {
  const { colors } = useTheme();
  const { animate } = useMotionPreference();
  const reduced = !animate;
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    progress.value = 0;
    progress.value = withRepeat(
      withTiming(1, { duration: 1100, easing: Easing.out(Easing.quad) }),
      -1,
      false,
    );
  }, [progress, reduced]);

  const ringA = useAnimatedStyle(() => {
    const p = progress.value;
    return { transform: [{ scale: 0.65 + p * 0.85 }], opacity: 0.5 * (1 - p) };
  });
  const ringB = useAnimatedStyle(() => {
    const p = (progress.value + 0.5) % 1;
    return { transform: [{ scale: 0.65 + p * 0.85 }], opacity: 0.5 * (1 - p) };
  });

  return (
    <Card style={styles.card}>
      <View style={styles.rings}>
        <Animated.View style={[styles.ring, { borderColor: colors.accent }, ringA]} />
        <Animated.View style={[styles.ring, { borderColor: colors.accent }, ringB]} />
        <View style={[styles.center, { backgroundColor: withAlpha(colors.accent, 0.14) }]}>
          <Icon name="search" size={24} color={colors.accent} />
        </View>
      </View>
      <Text style={[styles.title, { color: colors.text }]}>Checking your device…</Text>
      <Text style={[styles.body, { color: colors.muted }]}>
        Storage, memory, battery, display, Wi-Fi and system settings.
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  badge: {
    width: 64,
    height: 64,
    borderRadius: radius.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.title,
  },
  body: {
    ...typography.body,
    textAlign: 'center',
  },
  rings: {
    width: 132,
    height: 132,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 132,
    height: 132,
    borderRadius: 66,
    borderWidth: 2,
  },
  center: {
    width: 64,
    height: 64,
    borderRadius: radius.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
