import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useMotionPreference } from '@/design-system/animations/use-motion-preference';

import { useTheme } from '@/design-system/theme';
import { radius, spacing, typography } from '@/design-system/tokens';
import { AppIcon } from '@/features/apps/components/app-icon';
import type { AppChartBar, ScreenTimeBar } from '@/features/apps/types';

const BAR_MS = 520;
const VERTICAL_BAR_HEIGHT = 120;

/** Label + count above a growing horizontal bar; used by every analyzer chart. */
export function HorizontalBars({
  bars,
  formatValue,
}: {
  bars: AppChartBar[];
  formatValue?: (bar: AppChartBar) => string;
}) {
  if (bars.length === 0) return null;
  return (
    <View style={styles.list}>
      {bars.map((bar) => (
        <HorizontalBar
          key={bar.key}
          bar={bar}
          value={formatValue ? formatValue(bar) : String(bar.count)}
        />
      ))}
    </View>
  );
}

function HorizontalBar({ bar, value }: { bar: AppChartBar; value: string }) {
  const { colors } = useTheme();
  const { animate } = useMotionPreference();
  const reduced = !animate;
  const [trackWidth, setTrackWidth] = useState(0);
  const progress = useSharedValue(reduced ? bar.share : 0);

  useEffect(() => {
    progress.value = reduced
      ? bar.share
      : withTiming(bar.share, { duration: BAR_MS, easing: Easing.out(Easing.cubic) });
  }, [bar.share, progress, reduced]);

  const fillStyle = useAnimatedStyle(() => ({
    width: Math.max(3, progress.value * trackWidth),
  }));

  return (
    <View style={styles.listRow}>
      <View style={styles.listHead}>
        {bar.icon !== undefined ? (
          <AppIcon icon={bar.icon ?? null} label={bar.label} size={28} />
        ) : null}
        <View style={styles.headText}>
          <Text numberOfLines={1} style={[styles.chartLabel, { color: colors.text }]}>
            {bar.label}
          </Text>
          {bar.caption ? (
            <Text numberOfLines={1} style={[styles.chartCaption, { color: colors.muted }]}>
              {bar.caption}
            </Text>
          ) : null}
        </View>
        <Text style={[styles.chartValue, { color: colors.muted }]}>{value}</Text>
      </View>
      <View
        onLayout={(event: LayoutChangeEvent) => setTrackWidth(event.nativeEvent.layout.width)}
        style={[styles.track, { backgroundColor: colors.surface2 }]}
      >
        <Animated.View style={[styles.trackFill, { backgroundColor: colors.accent }, fillStyle]} />
      </View>
    </View>
  );
}

/** Weekday/daily bars for screen time; the tallest bar fills the chart. */
export function VerticalBars({
  bars,
  formatValue,
}: {
  bars: ScreenTimeBar[];
  formatValue?: (bar: ScreenTimeBar) => string;
}) {
  const { colors } = useTheme();
  if (bars.length === 0) return null;
  return (
    <View>
      <View style={[styles.verticalWrap, { borderColor: colors.border }]}>
        {bars.map((bar) => (
          <VerticalBar key={bar.key} bar={bar} value={formatValue ? formatValue(bar) : ''} />
        ))}
      </View>
      <View style={styles.verticalLabels}>
        {bars.map((bar) => (
          <Text key={bar.key} style={[styles.weekLabel, { color: colors.muted }]}>
            {bar.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

function VerticalBar({ bar, value }: { bar: ScreenTimeBar; value: string }) {
  const { colors } = useTheme();
  const { animate } = useMotionPreference();
  const reduced = !animate;
  const progress = useSharedValue(reduced ? bar.share : 0);

  useEffect(() => {
    progress.value = reduced
      ? bar.share
      : withTiming(bar.share, { duration: BAR_MS, easing: Easing.out(Easing.cubic) });
  }, [bar.share, progress, reduced]);

  const barStyle = useAnimatedStyle(() => ({
    height: Math.max(2, progress.value * VERTICAL_BAR_HEIGHT),
  }));

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${bar.label}${value !== '' ? `, ${value}` : ''}`}
      style={styles.verticalColumn}
    >
      <Animated.View style={[styles.verticalBar, { backgroundColor: colors.accent }, barStyle]} />
      {value !== '' ? (
        <Text numberOfLines={1} style={[styles.verticalValue, { color: colors.muted }]}>
          {value}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  listRow: {
    gap: 6,
  },
  listHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  headText: {
    flex: 1,
    gap: 2,
  },
  chartLabel: {
    ...typography.body,
  },
  chartCaption: {
    ...typography.caption,
  },
  chartValue: {
    ...typography.mono,
  },
  track: {
    height: 8,
    borderRadius: radius.chip,
    overflow: 'hidden',
  },
  trackFill: {
    height: 8,
    borderRadius: radius.chip,
  },
  verticalWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.xs,
    height: VERTICAL_BAR_HEIGHT + 24,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 2,
  },
  verticalColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  verticalBar: {
    width: '68%',
    borderRadius: 6,
  },
  verticalValue: {
    ...typography.caption,
  },
  verticalLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xs,
    paddingTop: spacing.xs,
  },
  weekLabel: {
    ...typography.caption,
    flex: 1,
    textAlign: 'center',
  },
});
