import type { ReactNode } from 'react';
import Animated, { FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated';

import { durations, springs, staggerDelay } from '@/design-system/animations/motion';
import { useMotionPreference } from '@/design-system/animations/use-motion-preference';

type Props = {
  index?: number;
  children: ReactNode;
};

/**
 * Dashboard tile wrapper: a staggered entrance plus a Reanimated layout
 * transition so the grid settles smoothly when tiles are reordered or hidden.
 * The same wrapper gives the tile-to-detail navigation a shared-axis feel when
 * the stack slides the detail screen over the preserved grid.
 */
export function TileTransition({ index = 0, children }: Props) {
  const { level } = useMotionPreference();

  if (level === 'off') {
    return <>{children}</>;
  }

  const entering =
    level === 'reduced'
      ? FadeIn.duration(durations.fast)
      : FadeInDown.delay(staggerDelay(index)).duration(durations.normal);

  return (
    <Animated.View
      entering={entering}
      layout={
        level === 'full' ? LinearTransition.springify().damping(springs.layout.damping) : undefined
      }
    >
      {children}
    </Animated.View>
  );
}
