import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { withAlpha } from '@/design-system/color';
import { useTheme } from '@/design-system/theme';
import { spacing, typography } from '@/design-system/tokens';
import {
  channelGraphBars,
  channelGraphDomain,
  type AnalyzerNetwork,
  type ChannelGraphBar,
} from '@/features/network/services/wifi-analyzer-service';

const GRAPH_HEIGHT = 88;
const AXIS_HEIGHT = 20;
const MIN_BAR_WIDTH = 3;

type Props = {
  networks: AnalyzerNetwork[];
  band: '2.4' | '5';
};

/**
 * Channel-overlap graph: one bar per network, centred on its channel and as
 * wide as its channel width, so overlapping channels are visible. Bars animate
 * up when the scan list changes; the reduced-motion setting skips the motion.
 */
export function ChannelGraph({ networks, band }: Props) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const bars = channelGraphBars(networks, band);
  const domain = channelGraphDomain(band);
  const span = domain.max - domain.min;

  const onLayout = (event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  };

  const label =
    bars.length === 0
      ? `${band} GHz channel graph: no networks`
      : `${band} GHz channel graph: ${bars.length} network${bars.length === 1 ? '' : 's'}`;

  return (
    <View>
      <View
        accessible
        accessibilityLabel={label}
        onLayout={onLayout}
        style={[styles.graph, { borderColor: colors.border }]}
      >
        {width > 0 &&
          bars.map((bar) => (
            <Bar
              key={bar.key}
              bar={bar}
              domainMin={domain.min}
              span={span}
              width={width}
              color={withAlpha(colors.accent, 0.55)}
            />
          ))}
        {domain.ticks.map((tick) => (
          <Text
            key={tick}
            style={[
              styles.tick,
              { color: colors.muted, left: ((tick - domain.min) / span) * width - 12 },
            ]}
          >
            {tick}
          </Text>
        ))}
      </View>
      {bars.length === 0 ? (
        <Text style={[styles.empty, { color: colors.muted }]}>
          No {band} GHz networks in this scan.
        </Text>
      ) : null}
    </View>
  );
}

type BarProps = {
  bar: ChannelGraphBar;
  domainMin: number;
  span: number;
  width: number;
  color: string;
};

function Bar({ bar, domainMin, span, width, color }: BarProps) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    const target = bar.heightRatio;
    progress.value = reduced ? target : withTiming(target, { duration: 450 });
  }, [bar.heightRatio, progress, reduced]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: Math.max(4, progress.value * GRAPH_HEIGHT),
  }));

  const left = ((bar.channelStart - domainMin) / span) * width;
  const barWidth = Math.max(MIN_BAR_WIDTH, (bar.units / span) * width);

  return (
    <Animated.View
      style={[styles.bar, { left, width: barWidth, backgroundColor: color }, animatedStyle]}
    />
  );
}

const styles = StyleSheet.create({
  graph: {
    height: GRAPH_HEIGHT + AXIS_HEIGHT,
    justifyContent: 'flex-end',
  },
  bar: {
    position: 'absolute',
    bottom: AXIS_HEIGHT,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  tick: {
    position: 'absolute',
    bottom: 0,
    width: 24,
    textAlign: 'center',
    ...typography.caption,
    fontSize: 10,
  },
  empty: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
});
