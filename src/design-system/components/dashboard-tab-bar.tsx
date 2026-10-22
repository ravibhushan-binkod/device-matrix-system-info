import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/design-system/animations/pressable-scale';
import { TabPill } from '@/design-system/animations/tab-pill';
import { withAlpha } from '@/design-system/color';
import { Icon, type IconName } from '@/design-system/icon';
import { useTheme } from '@/design-system/theme';
import { spacing, typography } from '@/design-system/tokens';

const TAB_ICONS: Record<string, IconName> = {
  index: 'home',
  hardware: 'cpu',
  network: 'wifi',
  apps: 'apps',
  tools: 'tools',
};

const TAB_LABELS: Record<string, string> = {
  index: 'Home',
  hardware: 'Hardware',
  network: 'Network',
  apps: 'Apps',
  tools: 'Tools',
};

/** Glass tab bar with the single morphing indicator from the motion layer. */
export function DashboardTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const count = state.routes.length;
  const itemWidth = width / Math.max(1, count);

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: withAlpha(colors.surface, 0.98),
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, spacing.xs),
        },
      ]}
    >
      <View style={styles.inner}>
        <TabPill
          index={state.index}
          count={count}
          itemWidth={itemWidth}
          height={50}
          top={2}
          horizontalInset={8}
        />
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const options = descriptors[route.key]?.options;
          const label = TAB_LABELS[route.name] ?? options?.title ?? route.name;
          const icon = TAB_ICONS[route.name] ?? 'apps';
          const tint = focused ? colors.accent : colors.muted;

          return (
            <PressableScale
              key={route.key}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name, route.params);
                }
              }}
              onLongPress={() => {
                navigation.emit({ type: 'tabLongPress', target: route.key });
              }}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={options?.tabBarAccessibilityLabel ?? label}
              style={styles.item}
            >
              <Icon name={icon} size={20} color={tint} />
              <Text style={[styles.label, { color: tint }]}>{label}</Text>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inner: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
  },
  item: {
    flex: 1,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  label: {
    ...typography.caption,
    fontFamily: 'Inter_500Medium',
  },
});
