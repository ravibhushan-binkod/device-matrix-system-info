import type { ReactNode } from 'react';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { durations, staggerDelay } from '@/design-system/animations/motion';
import { useMotionPreference } from '@/design-system/animations/use-motion-preference';

type Props = {
  /** Position in the list — drives the stagger delay. */
  index?: number;
  children: ReactNode;
};

/**
 * List item entrance: fade + slide down, staggered by index. Reduced keeps a
 * short fade without movement; Off mounts immediately.
 */
export function StaggerItem({ index = 0, children }: Props) {
  const { level } = useMotionPreference();

  if (level === 'off') {
    return <>{children}</>;
  }

  const entering =
    level === 'reduced'
      ? FadeIn.duration(durations.fast)
      : FadeInDown.delay(staggerDelay(index)).duration(durations.normal);

  return <Animated.View entering={entering}>{children}</Animated.View>;
}
