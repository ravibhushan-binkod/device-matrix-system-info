import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { durations } from '@/design-system/animations/motion';
import { useMotionPreference } from '@/design-system/animations/use-motion-preference';
import { useTheme } from '@/design-system/theme';
import { radius, spacing, typography } from '@/design-system/tokens';
import { useCopyToastStore } from '@/state/copy-toast-store';

const AnimatedView = Animated.createAnimatedComponent(View);

/**
 * A small pill above the tab bar. It never covers a button and disappears on
 * its own; assistive tech hears the same message through the live region.
 */
export function CopyToast() {
  const { colors } = useTheme();
  const { animate } = useMotionPreference();
  const insets = useSafeAreaInsets();
  const message = useCopyToastStore((state) => state.message);
  const token = useCopyToastStore((state) => state.token);
  const hide = useCopyToastStore((state) => state.hide);

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(animate ? 8 : 0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!message) return;

    opacity.value = animate ? withTiming(1, { duration: durations.fast }) : 1;
    translateY.value = animate ? withTiming(0, { duration: durations.fast }) : 0;

    timer.current = setTimeout(() => {
      opacity.value = animate ? withTiming(0, { duration: durations.fast }) : 0;
      translateY.value = animate ? withTiming(8, { duration: durations.fast }) : 8;
      timer.current = setTimeout(hide, animate ? durations.fast : 0);
    }, 1800);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [animate, hide, message, opacity, token, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!message) return null;

  return (
    <AnimatedView
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={[
        styles.toast,
        {
          bottom: insets.bottom + 84,
          backgroundColor: colors.surface2,
          borderColor: colors.border,
        },
        animatedStyle,
      ]}
    >
      <Text numberOfLines={1} style={[styles.text, { color: colors.text }]}>
        {message}
      </Text>
    </AnimatedView>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    maxWidth: '86%',
    borderRadius: radius.chip,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  text: {
    ...typography.body,
    textAlign: 'center',
  },
});
