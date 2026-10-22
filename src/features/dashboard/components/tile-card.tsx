import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { withAlpha } from '@/design-system/color';
import { Card } from '@/design-system/components';
import { copyValue } from '@/design-system/copy/copy-value';
import { Icon, type IconName } from '@/design-system/icon';
import { useTheme } from '@/design-system/theme';
import { spacing, typography, type AppColors } from '@/design-system/tokens';
import {
  getDashboardTileDefinition,
  type DashboardTileAccent,
  type DashboardTileId,
  type DashboardTileSize,
} from '@/features/dashboard/services/dashboard-tiles';

export const DASHBOARD_TILE_HEIGHTS: Record<DashboardTileSize, number> = {
  s: 150,
  m: 190,
  l: 220,
};

export function tileAccentColor(accent: DashboardTileAccent, colors: AppColors): string {
  switch (accent) {
    case 'accent':
      return colors.accent;
    case 'violet':
      return colors.violet;
    case 'good':
      return colors.good;
    case 'warning':
      return colors.warning;
    case 'primary':
    default:
      return colors.primary;
  }
}

type TileHeaderProps = {
  accent: DashboardTileAccent;
  title: string;
  icon: IconName;
  trailing?: ReactNode;
};

/** Small icon + title row shared by every dashboard tile. */
export function TileHeader({ accent, title, icon, trailing }: TileHeaderProps) {
  const { colors } = useTheme();
  const tint = tileAccentColor(accent, colors);

  return (
    <View style={styles.header}>
      <View style={[styles.iconBadge, { backgroundColor: withAlpha(tint, 0.13) }]}>
        <Icon name={icon} size={16} color={tint} />
      </View>
      <Text numberOfLines={1} style={[styles.headerTitle, { color: colors.muted }]}>
        {title}
      </Text>
      <View style={styles.headerSpacer} />
      {trailing}
      <Icon name="chevron-right" size={16} color={withAlpha(colors.muted, 0.7)} />
    </View>
  );
}

type Props = {
  id: DashboardTileId;
  size: DashboardTileSize;
  onPress: () => void;
  children: ReactNode;
  accessibilityLabel: string;
  /** Plain-text reading copied on long press. */
  copyText?: string;
  style?: StyleProp<ViewStyle>;
};

/** The glass shell every tile shares; content height follows the registry size. */
export function TileCard({
  id,
  size,
  onPress,
  children,
  accessibilityLabel,
  copyText,
  style,
}: Props) {
  const { colors } = useTheme();
  const definition = getDashboardTileDefinition(id);
  const tint = tileAccentColor(definition.accent, colors);
  const height = DASHBOARD_TILE_HEIGHTS[size];

  return (
    <Card
      onPress={onPress}
      onLongPress={copyText ? () => void copyValue(copyText, definition.title) : undefined}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={`Opens ${definition.title}${
        copyText ? '. Long press to copy this reading' : ''
      }`}
      style={[{ height, borderColor: withAlpha(tint, 0.2) }, style]}
    >
      <View style={{ height: height - 34, gap: spacing.sm }}>{children}</View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 26,
  },
  iconBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.caption,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  headerSpacer: {
    flex: 1,
  },
});
