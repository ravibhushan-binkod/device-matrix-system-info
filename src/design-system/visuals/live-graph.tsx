import { Canvas, Circle, LinearGradient, Path, Skia, vec } from '@shopify/react-native-skia';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { Easing, useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated';

import { useMotionPreference } from '@/design-system/animations/use-motion-preference';
import { withAlpha } from '@/design-system/color';
import { clamp01 } from '@/design-system/status';
import { useTheme } from '@/design-system/theme';
import { spacing, typography } from '@/design-system/tokens';

type Props = {
  data: number[];
  /** Fixed scale bounds; auto-follows the data when omitted. */
  min?: number;
  max?: number;
  height?: number;
  paused?: boolean;
  color?: string;
  /** Spoken noun for TalkBack; defaults to "Live graph". */
  accessibilityLabel?: string;
};

type Point = { x: number; y: number };

function buildPath(points: Point[], upto: number, bottom: number, close: boolean) {
  'worklet';
  const path = Skia.Path.Make();
  const n = points.length;
  const first = points[0];
  if (n === 0 || first == null) return path;

  path.moveTo(first.x, first.y);
  for (let i = 0; i < n - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (a == null || b == null) break;
    if (i + 1 > upto) break;

    const nextT = Math.min(1, upto - i);
    if (nextT < 1) {
      path.lineTo(a.x + (b.x - a.x) * nextT, a.y + (b.y - a.y) * nextT);
      break;
    }

    const after = points[i + 2];
    if (i + 2 <= n - 1 && after != null) {
      path.quadTo(b.x, b.y, (b.x + after.x) / 2, (b.y + after.y) / 2);
    } else {
      path.lineTo(b.x, b.y);
      break;
    }
  }

  if (close) {
    const tip = points[Math.min(n - 1, Math.floor(upto))] ?? first;
    path.lineTo(tip.x, bottom);
    path.lineTo(first.x, bottom);
    path.close();
  }
  return path;
}

function tipPoint(points: Point[], upto: number): Point {
  'worklet';
  const n = points.length;
  const first = points[0];
  if (n === 0 || first == null) return { x: 0, y: 0 };
  if (n === 1) return first;

  const clamped = Math.max(0, Math.min(n - 1, upto));
  const index = Math.min(n - 2, Math.floor(clamped));
  const a = points[index] ?? first;
  const b = points[index + 1] ?? a;
  const t = clamped - index;
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** Smooth line graph that draws itself as data arrives; `paused` freezes it. */
export function LiveGraph({
  data,
  min,
  max,
  height = 120,
  paused = false,
  color,
  accessibilityLabel = 'Live graph',
}: Props) {
  const { colors } = useTheme();
  const { animate } = useMotionPreference();
  const reduced = !animate;
  const [width, setWidth] = useState(0);
  const tint = color ?? colors.accent;

  const scale = useMemo(() => {
    if (min != null && max != null) return { lo: min, hi: max };
    if (data.length === 0) return { lo: 0, hi: 1 };
    const lo = Math.min(...data);
    const hi = Math.max(...data);
    return hi - lo < 1e-6 ? { lo: lo - 0.5, hi: hi + 0.5 } : { lo, hi };
  }, [data, min, max]);

  const graphH = height - 8;
  const reveal = useSharedValue(reduced ? 1 : 0);
  const previousCount = useRef(0);

  useEffect(() => {
    const count = data.length;
    if (count === 0) {
      previousCount.current = 0;
      reveal.value = 0;
      return;
    }
    if (reduced || paused) {
      reveal.value = 1;
      previousCount.current = count;
      return;
    }
    const from =
      previousCount.current <= 1 ? 0 : (previousCount.current - 1) / Math.max(1, count - 1);
    previousCount.current = count;
    reveal.value = from;
    reveal.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.quad) });
  }, [data, paused, reduced, reveal]);

  const points = useDerivedValue<Point[]>(() => {
    if (data.length === 0 || width <= 0) return [];
    const span = scale.hi - scale.lo || 1;
    const step = data.length > 1 ? width / (data.length - 1) : 0;
    return data.map((value, index) => ({
      x: index * step,
      y: 4 + (1 - clamp01((value - scale.lo) / span)) * graphH,
    }));
  }, [data, width, scale.lo, scale.hi, graphH]);

  const linePath = useDerivedValue(() => {
    const pts = points.value;
    return buildPath(pts, reveal.value * Math.max(0, pts.length - 1), graphH, false);
  }, [points, reveal, graphH]);

  const areaPath = useDerivedValue(() => {
    const pts = points.value;
    return buildPath(pts, reveal.value * Math.max(0, pts.length - 1), graphH, true);
  }, [points, reveal, graphH]);

  const tipX = useDerivedValue(
    () => tipPoint(points.value, reveal.value * Math.max(0, points.value.length - 1)).x,
    [points, reveal],
  );
  const tipY = useDerivedValue(
    () => tipPoint(points.value, reveal.value * Math.max(0, points.value.length - 1)).y,
    [points, reveal],
  );

  const round = (value: number) => Math.round(value * 10) / 10;
  const latest = data.length > 0 ? (data[data.length - 1] ?? null) : null;
  const spoken =
    latest == null
      ? `${accessibilityLabel}: no samples yet`
      : `${accessibilityLabel}: latest ${round(latest)}, lowest ${round(Math.min(...data))}, highest ${round(Math.max(...data))}${paused ? ', paused' : ''}`;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={spoken}
      onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
    >
      <View style={[styles.canvasWrap, { height, opacity: paused ? 0.55 : 1 }]}>
        {width > 0 ? (
          <Canvas style={{ width, height }}>
            <Path path={areaPath}>
              <LinearGradient
                start={vec(0, 0)}
                end={vec(0, graphH)}
                colors={[withAlpha(tint, 0.28), withAlpha(tint, 0)]}
              />
            </Path>
            <Path
              path={linePath}
              style="stroke"
              strokeWidth={2}
              strokeCap="round"
              strokeJoin="round"
              color={tint}
            />
            <Circle cx={tipX} cy={tipY} r={4} color={tint} />
          </Canvas>
        ) : null}
        {paused ? <Text style={[styles.paused, { color: colors.muted }]}>Paused</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  canvasWrap: {
    width: '100%',
  },
  paused: {
    ...typography.mono,
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
});
