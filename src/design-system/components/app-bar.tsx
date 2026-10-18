import { StyleSheet, Text, View } from 'react-native';
import type { ReactNode } from 'react';

import { useTheme } from '@/design-system/theme';
import { spacing, typography } from '@/design-system/tokens';

type Props = {
  title: string;
  subtitle?: string;
  /** Leading slot (e.g. a back button). */
  left?: ReactNode;
  /** Trailing slot (e.g. an action button). */
  right?: ReactNode;
};

/** In-screen app bar for screens that manage their own top area. */
export function AppBar({ title, subtitle, left, right }: Props) {
  const { colors } = useTheme();

  return (
    <View style={[styles.bar, { borderBottomColor: colors.border }]}>
      {left}
      <View style={styles.center}>
        <Text numberOfLines={1} style={[typography.title, { color: colors.text }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={[typography.caption, { color: colors.muted }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  center: {
    flex: 1,
    gap: 1,
  },
});
