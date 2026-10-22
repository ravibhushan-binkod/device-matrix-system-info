import { type Href, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/design-system/animations/pressable-scale';
import { SectionHeader } from '@/design-system/components';
import { withAlpha } from '@/design-system/color';
import { Icon, type IconName } from '@/design-system/icon';
import { useTheme } from '@/design-system/theme';
import { radius, spacing, typography } from '@/design-system/tokens';

type SectionShortcut = {
  label: string;
  icon: IconName;
  route: Href;
};

const SHORTCUTS: readonly SectionShortcut[] = [
  { label: 'Device', icon: 'display', route: '/device' },
  { label: 'Processor', icon: 'cpu', route: '/cpu' },
  { label: 'Memory', icon: 'memory', route: '/memory' },
  { label: 'Storage', icon: 'storage', route: '/storage' },
  { label: 'Battery', icon: 'battery', route: '/battery' },
  { label: 'Thermal', icon: 'thermometer', route: '/thermal' },
  { label: 'Display', icon: 'display', route: '/display' },
  { label: 'Camera', icon: 'camera', route: '/camera' },
  { label: 'Sensors', icon: 'sensors', route: '/sensors' },
  { label: 'Network', icon: 'wifi', route: '/network' },
  { label: 'Connectivity', icon: 'bluetooth', route: '/connectivity' },
  { label: 'Wi-Fi analyzer', icon: 'signal', route: '/wifi-analyzer' },
  { label: 'Data usage', icon: 'gauge', route: '/data-usage' },
  { label: 'Apps', icon: 'apps', route: '/apps' },
  { label: 'App analyzer', icon: 'search', route: '/app-analyzer' },
  { label: 'Permissions', icon: 'fingerprint', route: '/permission-analyzer' },
  { label: 'Screen time', icon: 'clock', route: '/screen-time' },
  { label: 'Hardware tests', icon: 'wrench', route: '/hardware-tests' },
  { label: 'Tips', icon: 'tips', route: '/tips' },
  { label: 'Report', icon: 'report', route: '/report' },
  { label: 'Tools', icon: 'tools', route: '/tools' },
  { label: 'Alarm', icon: 'alarm', route: '/alarm' },
  { label: 'Timer', icon: 'timer', route: '/timer' },
  { label: 'Touch test', icon: 'pointer', route: '/touch-test' },
  { label: 'Screen test', icon: 'sun', route: '/screen-test' },
  { label: 'Settings', icon: 'settings', route: '/settings' },
];

/** Every destination in the app, in a compact three-column grid. */
export function AllSectionsGrid() {
  const { colors } = useTheme();
  const router = useRouter();

  const tintAt = (index: number): string => {
    switch (index % 4) {
      case 1:
        return colors.violet;
      case 2:
        return colors.primary;
      case 3:
        return colors.good;
      default:
        return colors.accent;
    }
  };

  return (
    <View>
      <View style={styles.header}>
        <SectionHeader title="All sections" />
      </View>
      <View style={styles.wrap}>
        <View style={styles.grid}>
          {SHORTCUTS.map((section, index) => {
            const tint = tintAt(index);
            return (
              <PressableScale
                key={section.label}
                onPress={() => router.push(section.route)}
                accessibilityRole="button"
                accessibilityLabel={section.label}
                style={[
                  styles.shortcut,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <View style={[styles.iconBadge, { backgroundColor: withAlpha(tint, 0.11) }]}>
                  <Icon name={section.icon} size={16} color={tint} />
                </View>
                <Text numberOfLines={2} style={[styles.label, { color: colors.text }]}>
                  {section.label}
                </Text>
              </PressableScale>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
  },
  wrap: {
    paddingHorizontal: spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.sm,
  },
  shortcut: {
    width: '31.6%',
    minHeight: 84,
    borderWidth: 1,
    borderRadius: radius.card,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typography.caption,
    textAlign: 'center',
    fontFamily: 'Inter_500Medium',
  },
});
