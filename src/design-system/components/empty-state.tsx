import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';

import { withAlpha } from '@/design-system/color';
import { Icon, type IconName } from '@/design-system/icon';
import { useTheme } from '@/design-system/theme';
import { radius, spacing, typography } from '@/design-system/tokens';

type Props = {
  icon: IconName;
  title: string;
  message?: string;
  /** Optional action (e.g. a Button). */
  action?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Centered icon + title + message, used for empty and "not available" states. */
export function EmptyState({ icon, title, message, action, style }: Props) {
  const { colors } = useTheme();

  return (
    <View style={[styles.root, style]}>
      <View style={[styles.badge, { backgroundColor: withAlpha(colors.accent, 0.12) }]}>
        <Icon name={icon} size={24} color={colors.accent} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {message ? <Text style={[styles.message, { color: colors.muted }]}>{message}</Text> : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
  },
  badge: {
    width: 56,
    height: 56,
    borderRadius: radius.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.title,
    textAlign: 'center',
  },
  message: {
    ...typography.body,
    textAlign: 'center',
    maxWidth: 280,
  },
  action: {
    marginTop: spacing.md,
  },
});
