import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { useMotionPreference } from '@/design-system/animations/use-motion-preference';
import { withAlpha } from '@/design-system/color';
import { useScreenFocused } from '@/design-system/hooks/use-screen-focused';

type Props = {
  width: number;
  height: number;
  color: string;
  /** Only show above the hot threshold; the caller decides. */
  active?: boolean;
};

type WaveProps = {
  width: number;
  height: number;
  color: string;
  phase: SharedValue<number>;
  index: number;
};

function Wave({ width, height, color, phase, index }: WaveProps) {
  const path = useDerivedValue(() => {
    const wave = Skia.Path.Make();
    const baseY = height * (0.22 + index * 0.16);
    const amplitude = 2 + index * 0.7;
    for (let x = 0; x <= width; x += 3) {
      const y =
        baseY +
        Math.sin((x / Math.max(1, width)) * Math.PI * 4 + phase.value * Math.PI * 2 + index) *
          amplitude;
      if (x === 0) wave.moveTo(x, y);
      else wave.lineTo(x, y);
    }
    return wave;
  });

  return (
    <Path
      path={path}
      style="stroke"
      strokeWidth={1.4}
      strokeCap="round"
      color={withAlpha(color, 0.42 - index * 0.07)}
    />
  );
}

/** Thin rising heat lines over a hot reading. Skia values only; stops when hidden. */
export function HeatShimmer({ width, height, color, active = true }: Props) {
  const { loops } = useMotionPreference();
  const focused = useScreenFocused();
  const phase = useSharedValue(0);

  useEffect(() => {
    if (!active || !loops || !focused) {
      phase.value = 0;
      return;
    }
    phase.value = withRepeat(withTiming(1, { duration: 2_600, easing: Easing.linear }), -1, false);
  }, [active, focused, loops, phase]);

  if (!active) return null;

  return (
    <View pointerEvents="none" style={[styles.root, { width, height }]}>
      <Canvas style={{ width, height }}>
        {[0, 1, 2].map((index) => (
          <Wave
            key={index}
            width={width}
            height={height}
            color={color}
            phase={phase}
            index={index}
          />
        ))}
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
