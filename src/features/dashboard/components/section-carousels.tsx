import { type Href, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

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

type SectionGroup = {
  key: string;
  title: string;
  shortcuts: readonly SectionShortcut[];
};

/**
 * Every destination in the app, grouped so Home can show them as horizontal
 * carousels. "See all" expands one group into the familiar grid; "Collapse"
 * returns to the row. Every group below contains each shortcut exactly once.
 */
const GROUPS: readonly SectionGroup[] = [
  {
    key: 'system',
    title: 'System info',
    shortcuts: [
      { label: 'Device', icon: 'display', route: '/device' },
      { label: 'Processor', icon: 'cpu', route: '/cpu' },
      { label: 'Memory', icon: 'memory', route: '/memory' },
      { label: 'Storage', icon: 'storage', route: '/storage' },
      { label: 'Battery', icon: 'battery', route: '/battery' },
      { label: 'Thermal', icon: 'thermometer', route: '/thermal' },
      { label: 'Display', icon: 'display', route: '/display' },
      { label: 'Camera', icon: 'camera', route: '/camera' },
      { label: 'Sensors', icon: 'sensors', route: '/sensors' },
      { label: 'Connectivity', icon: 'bluetooth', route: '/connectivity' },
    ],
  },
  {
    key: 'network',
    title: 'Network',
    shortcuts: [
      { label: 'Network', icon: 'wifi', route: '/network' },
      { label: 'Wi-Fi analyzer', icon: 'signal', route: '/wifi-analyzer' },
      { label: 'Data usage', icon: 'gauge', route: '/data-usage' },
    ],
  },
  {
    key: 'apps',
    title: 'Apps and usage',
    shortcuts: [
      { label: 'Apps', icon: 'apps', route: '/apps' },
      { label: 'App analyzer', icon: 'search', route: '/app-analyzer' },
      { label: 'Permissions', icon: 'fingerprint', route: '/permission-analyzer' },
      { label: 'Screen time', icon: 'clock', route: '/screen-time' },
    ],
  },
  {
    key: 'tests',
    title: 'Tests and tools',
    shortcuts: [
      { label: 'Hardware tests', icon: 'wrench', route: '/hardware-tests' },
      { label: 'Touch test', icon: 'pointer', route: '/touch-test' },
      { label: 'Screen test', icon: 'sun', route: '/screen-test' },
      { label: 'Alarm', icon: 'alarm', route: '/alarm' },
      { label: 'Timer', icon: 'timer', route: '/timer' },
      { label: 'Tools', icon: 'tools', route: '/tools' },
    ],
  },
  {
    key: 'more',
    title: 'More',
    shortcuts: [
      { label: 'Tips', icon: 'tips', route: '/tips' },
      { label: 'Report', icon: 'report', route: '/report' },
      { label: 'Settings', icon: 'settings', route: '/settings' },
    ],
  },
];

const TINTS = ['accent', 'violet', 'primary', 'good'] as const;

/** One carousel row card; carousel cards are all the same size. */
const CAROUSEL_CARD_WIDTH = 132;
const CAROUSEL_CARD_HEIGHT = 96;

type ShortcutTileProps = {
  shortcut: SectionShortcut;
  index: number;
  /** Carousel cards are fixed-size; grid cards stretch to the column. */
  fixed: boolean;
};

function ShortcutTile({ shortcut, index, fixed }: ShortcutTileProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const tint = colors[TINTS[index % TINTS.length] ?? 'accent'];

  return (
    <PressableScale
      onPress={() => router.push(shortcut.route)}
      accessibilityRole="button"
      accessibilityLabel={shortcut.label}
      style={[
        styles.shortcut,
        fixed ? styles.shortcutFixed : styles.shortcutGrid,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={[styles.iconBadge, { backgroundColor: withAlpha(tint, 0.11) }]}>
        <Icon name={shortcut.icon} size={16} color={tint} />
      </View>
      <Text
        numberOfLines={2}
        maxFontSizeMultiplier={1.3}
        style={[styles.label, { color: colors.text }]}
      >
        {shortcut.label}
      </Text>
    </PressableScale>
  );
}

type GroupCarouselProps = {
  group: SectionGroup;
};

function GroupCarousel({ group }: GroupCarouselProps) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);

  return (
    <View>
      <View style={styles.header}>
        <SectionHeader
          title={group.title}
          action={
            <PressableScale
              haptic={false}
              accessibilityRole="button"
              accessibilityLabel={
                expanded ? `Collapse ${group.title}` : `See all ${group.title} sections`
              }
              onPress={() => setExpanded((value) => !value)}
              hitSlop={6}
            >
              <Text style={[styles.action, { color: colors.accent }]}>
                {expanded ? 'Collapse' : 'See all'}
              </Text>
            </PressableScale>
          }
        />
      </View>
      {expanded ? (
        <View style={[styles.gridWrap, styles.grid]}>
          {group.shortcuts.map((shortcut, index) => (
            <ShortcutTile key={shortcut.label} shortcut={shortcut} index={index} fixed={false} />
          ))}
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
        >
          {group.shortcuts.map((shortcut, index) => (
            <ShortcutTile key={shortcut.label} shortcut={shortcut} index={index} fixed />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

/** The grouped homepage carousels that replaced the single "All sections" grid. */
export function SectionCarousels() {
  return (
    <View style={styles.root}>
      {GROUPS.map((group) => (
        <GroupCarousel key={group.key} group={group} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.xl,
  },
  header: {
    paddingHorizontal: spacing.lg,
  },
  action: {
    ...typography.caption,
    fontFamily: 'Inter_600SemiBold',
  },
  row: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  gridWrap: {
    paddingHorizontal: spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.sm,
  },
  shortcut: {
    borderWidth: 1,
    borderRadius: radius.card,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  shortcutFixed: {
    width: CAROUSEL_CARD_WIDTH,
    height: CAROUSEL_CARD_HEIGHT,
  },
  shortcutGrid: {
    width: '31.6%',
    minHeight: 84,
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
