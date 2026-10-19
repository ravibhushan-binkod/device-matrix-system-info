import type { ReactNode } from 'react';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';

import { durations, staggerMs } from '@/design-system/animations/motion';

type Props = {
  /** Position in the list — drives the stagger delay. */
  index?: number;
  children: ReactNode;
};

/**
 * List item entrance: fade + slide down, staggered by index.
 * Skipped entirely when the system reduce-motion setting is on.
 */
export function StaggerItem({ index = 0, children }: Props) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <>{children}</>;
  }

  return (
    <Animated.View entering={FadeInDown.delay(index * staggerMs).duration(durations.normal)}>
      {children}
    </Animated.View>
  );
}
