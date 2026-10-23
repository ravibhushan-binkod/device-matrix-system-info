import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/design-system/animations/pressable-scale';
import { SectionHeader } from '@/design-system/components';
import { withAlpha } from '@/design-system/color';
import { Icon } from '@/design-system/icon';
import { useTheme } from '@/design-system/theme';
import { radius, spacing, typography } from '@/design-system/tokens';
import {
  visibleDashboardSections,
  type SectionGroupDefinition,
  type SectionShortcut,
} from '@/features/dashboard/services/dashboard-sections';
import { useDashboardLayoutStore } from '@/state/dashboard-store';

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
  group: SectionGroupDefinition;
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

/** The grouped homepage sliders, following the order and visibility in Settings. */
export function SectionCarousels() {
  const preferences = useDashboardLayoutStore((state) => state.sections);
  const groups = visibleDashboardSections(preferences);
  if (groups.length === 0) return null;

  return (
    <View style={styles.root}>
      {groups.map((group) => (
        <GroupCarousel key={group.id} group={group} />
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
