import { Canvas, RoundedRect } from '@shopify/react-native-skia';
import { useEffect, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import {
  Easing,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { Chip } from '@/design-system/components/chip';
import { withAlpha } from '@/design-system/color';
import { useTheme } from '@/design-system/theme';
import { spacing } from '@/design-system/tokens';

export type StorageSegment = {
  key: string;
  label: string;
  value: number;
  /** Bar + legend colour. */
  color: string;
  /** Human-readable value shown on the legend chip. */
  valueLabel?: string;
};

type Props = {
  segments: StorageSegment[];
  /** Grand total; the remainder is drawn as a muted "Free" segment. */
  total?: number;
  height?: number;
  showLegend?: boolean;
};

const GAP = 2;

type SegmentProps = {
  x: number;
  width: number;
  height: number;
  color: string;
  delay: number;
  reduced: boolean;
};

function Segment({ x, width, height, color, delay, reduced }: SegmentProps) {
  const progress = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    progress.value = reduced
      ? 1
      : withDelay(delay, withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }));
  }, [delay, progress, reduced]);

  const animatedWidth = useDerivedValue(() => Math.max(0, width * progress.value));

  return (
    <RoundedRect
      x={x}
      y={0}
      width={animatedWidth}
      height={height}
      r={Math.min(height / 2, 6)}
      color={color}
    />
  );
}

/** Segmented usage bar (apps / media / other / free) with staggered fill. */
export function StorageBar({ segments, total, height = 14, showLegend = true }: Props) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);

  const sum = segments.reduce((acc, segment) => acc + Math.max(0, segment.value), 0);
  const all: StorageSegment[] = [...segments];
  if (total != null && total > sum) {
    all.push({
      key: '__free',
      label: 'Free',
      value: total - sum,
      color: withAlpha(colors.muted, 0.35),
    });
  }
  const denominator = all.reduce((acc, segment) => acc + Math.max(0, segment.value), 0);

  const spoken =
    denominator === 0
      ? 'Storage usage: no data'
      : `Storage usage: ${all
          .map((segment) => `${segment.label} ${segment.valueLabel ?? Math.round(segment.value)}`)
          .join(', ')}`;

  const usable = width - (all.length - 1) * GAP;

  let cursor = 0;
  const laid = all.map((segment) => {
    const segmentWidth =
      denominator === 0 ? 0 : (Math.max(0, segment.value) / denominator) * usable;
    const entry = { segment, x: cursor, width: segmentWidth };
    cursor += segmentWidth + GAP;
    return entry;
  });

  return (
    <View style={styles.root}>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={spoken}
        onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
        style={[styles.track, { height, backgroundColor: colors.surface2 }]}
      >
        {width > 0 && denominator > 0 ? (
          <Canvas style={[styles.canvas, { width, height }]}>
            {laid.map(({ segment, x, width: segmentWidth }, index) => (
              <Segment
                key={segment.key}
                x={x}
                width={segmentWidth}
                height={height}
                color={segment.color}
                delay={index * 90}
                reduced={reduced}
              />
            ))}
          </Canvas>
        ) : null}
      </View>
      {showLegend ? (
        <View style={styles.legend}>
          {all.map((segment) => (
            <Chip
              key={segment.key}
              label={
                segment.valueLabel ? `${segment.label} · ${segment.valueLabel}` : segment.label
              }
              dotColor={segment.color}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.md,
  },
  track: {
    overflow: 'hidden',
    borderRadius: 999,
  },
  canvas: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
