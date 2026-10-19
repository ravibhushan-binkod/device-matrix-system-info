import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { useTheme } from '@/design-system/theme';
import { spacing, typography } from '@/design-system/tokens';

type Props = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
};

const KNOB = 20;
const ROW = 28;

/** Dev-only slider (no extra dependency) built on Gesture Handler + Reanimated. */
export function DevSlider({ label, value, min, max, step = 1, onChange, format }: Props) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const trackW = useSharedValue(0);
  const knob = useSharedValue(0);
  const start = useSharedValue(0);

  useEffect(() => {
    if (width <= 0 || max === min) return;
    knob.value = ((value - min) / (max - min)) * width;
  }, [value, width, min, max, knob]);

  const emit = (x: number) => {
    'worklet';
    if (trackW.value === 0) return;
    let raw = min + (x / trackW.value) * (max - min);
    if (step > 0) raw = Math.round(raw / step) * step;
    raw = Math.max(min, Math.min(max, raw));
    runOnJS(onChange)(raw);
  };

  const pan = Gesture.Pan()
    .onBegin(() => {
      start.value = knob.value;
    })
    .onUpdate((event) => {
      const x = Math.max(0, Math.min(trackW.value, start.value + event.translationX));
      // eslint-disable-next-line react-hooks/immutability -- Reanimated shared value
      knob.value = x;
      emit(x);
    });

  const tap = Gesture.Tap().onEnd((event) => {
    const x = Math.max(0, Math.min(trackW.value, event.x));
    // eslint-disable-next-line react-hooks/immutability -- Reanimated shared value
    knob.value = x;
    emit(x);
  });

  const fillStyle = useAnimatedStyle(() => ({ width: knob.value }));
  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: knob.value - KNOB / 2 }],
  }));

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={[typography.caption, { color: colors.muted }]}>{label}</Text>
        <Text style={[typography.mono, { color: colors.text }]}>
          {format ? format(value) : String(Math.round(value))}
        </Text>
      </View>
      <GestureDetector gesture={Gesture.Race(pan, tap)}>
        <View
          onLayout={(event: LayoutChangeEvent) => {
            const next = event.nativeEvent.layout.width;
            setWidth(next);
            trackW.value = next;
          }}
          style={styles.track}
        >
          <View style={[styles.line, { backgroundColor: colors.surface2 }]} />
          <Animated.View
            style={[styles.line, styles.fill, { backgroundColor: colors.accent }, fillStyle]}
          />
          <Animated.View
            style={[
              styles.knob,
              { backgroundColor: colors.text, borderColor: colors.surface },
              knobStyle,
            ]}
          />
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  track: {
    height: ROW,
    justifyContent: 'center',
  },
  line: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 4,
    borderRadius: 2,
  },
  fill: {
    right: undefined,
  },
  knob: {
    position: 'absolute',
    left: 0,
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    borderWidth: 2,
  },
});
