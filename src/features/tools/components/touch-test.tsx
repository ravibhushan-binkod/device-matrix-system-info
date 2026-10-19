import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';

import { PressableScale } from '@/design-system/animations/pressable-scale';
import { Chip, Screen } from '@/design-system/components';
import { Icon } from '@/design-system/icon';
import { useTheme } from '@/design-system/theme';
import { radius, spacing, typography } from '@/design-system/tokens';

const COLS = 6;
const ROWS = 10;
const CELLS = COLS * ROWS;

/**
 * Full-screen touch test: the grid itself is the responder, so every position
 * on the glass (including slow drags) maps to a zone that lights up.
 */
export function TouchTestScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [touched, setTouched] = useState<ReadonlySet<number>>(() => new Set());
  const size = useRef({ width: 0, height: 0 });

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    size.current = { width, height };
  };

  const mark = useCallback((event: GestureResponderEvent) => {
    const { width, height } = size.current;
    if (width <= 0 || height <= 0) return;
    const { locationX, locationY } = event.nativeEvent;
    const col = Math.min(COLS - 1, Math.max(0, Math.floor((locationX / width) * COLS)));
    const row = Math.min(ROWS - 1, Math.max(0, Math.floor((locationY / height) * ROWS)));
    const index = row * COLS + col;
    setTouched((previous) => {
      if (previous.has(index)) return previous;
      const next = new Set(previous);
      next.add(index);
      return next;
    });
  }, []);

  const done = touched.size === CELLS;

  return (
    <Screen edgeTop padded={false} contentStyle={styles.content}>
      <View style={styles.topBar}>
        <PressableScale
          onPress={() => router.back()}
          accessibilityRole="button"
          style={[styles.iconButton, { backgroundColor: colors.surface2 }]}
        >
          <Icon name="x" size={20} color={colors.text} />
        </PressableScale>
        <View style={styles.countWrap}>
          <Text style={[styles.count, { color: done ? colors.good : colors.text }]}>
            {touched.size} / {CELLS}
          </Text>
          <Text style={[styles.countHint, { color: colors.muted }]}>
            {done ? 'every zone responded' : 'zones touched'}
          </Text>
        </View>
        <Chip label="Reset" onPress={() => setTouched(new Set())} />
      </View>

      <Text style={[styles.instruction, { color: colors.muted }]}>
        Drag your finger over the whole grid, edge to edge. Every zone you touch lights up — if a
        zone stays dark, touches there are not reaching the screen.
      </Text>

      <View
        style={[styles.grid, { borderColor: colors.border }]}
        onLayout={onLayout}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={mark}
        onResponderMove={mark}
      >
        {Array.from({ length: CELLS }, (_, index) => (
          <View
            key={index}
            style={[
              styles.cell,
              {
                backgroundColor: touched.has(index) ? colors.accent : colors.surface,
                borderColor: colors.border,
              },
            ]}
          />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countWrap: {
    flex: 1,
    alignItems: 'center',
  },
  count: {
    ...typography.title,
  },
  countHint: {
    ...typography.caption,
  },
  instruction: {
    ...typography.caption,
  },
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 1,
    borderRadius: radius.button,
    overflow: 'hidden',
  },
  cell: {
    width: `${100 / COLS}%`,
    height: `${100 / ROWS}%`,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
