import * as Haptics from 'expo-haptics';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { durations } from '@/design-system/animations/motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  /** Light haptic feedback on press-in (default on). */
  haptic?: boolean;
  pressedScale?: number;
};

/**
 * Press feedback: slight scale-in plus an optional haptic. The scale is
 * skipped when the system reduce-motion setting is on.
 */
export function PressableScale({
  style,
  haptic = true,
  pressedScale = 0.97,
  onPressIn,
  onPressOut,
  ...rest
}: Props) {
  const reduced = useReducedMotion();
  const pressed = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressed.value }],
  }));

  return (
    <AnimatedPressable
      {...rest}
      style={[style, animatedStyle]}
      onPressIn={(event) => {
        if (!reduced) {
          // eslint-disable-next-line react-hooks/immutability -- Reanimated shared value
          pressed.value = withTiming(pressedScale, { duration: durations.fast });
        }
        if (haptic) {
          Haptics.selectionAsync().catch(() => {});
        }
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        if (!reduced) {
          // eslint-disable-next-line react-hooks/immutability -- Reanimated shared value
          pressed.value = withTiming(1, { duration: durations.fast });
        }
        onPressOut?.(event);
      }}
    />
  );
}
