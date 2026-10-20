import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/design-system/animations/pressable-scale';
import { withAlpha } from '@/design-system/color';
import { Icon, type IconName } from '@/design-system/icon';
import { useTheme } from '@/design-system/theme';
import { radius, spacing, typography } from '@/design-system/tokens';

type Props = {
  title: string;
  message: string;
  icon?: IconName;
  /** Action label (e.g. "Open settings"). The action hides without it. */
  actionLabel?: string;
  onAction?: () => void;
};

/** Warning-tinted banner shown when a feature needs a runtime permission. */
export function PermissionBanner({ title, message, icon = 'alert', actionLabel, onAction }: Props) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: withAlpha(colors.warning, 0.1),
          borderColor: withAlpha(colors.warning, 0.3),
        },
      ]}
    >
      <View style={[styles.badge, { backgroundColor: withAlpha(colors.warning, 0.16) }]}>
        <Icon name={icon} size={20} color={colors.warning} />
      </View>
      <View style={styles.text}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.message, { color: colors.muted }]}>{message}</Text>
        {actionLabel && onAction ? (
          <PressableScale
            onPress={onAction}
            accessibilityRole="button"
            hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
            style={styles.action}
          >
            <Text style={[styles.actionLabel, { color: colors.warning }]}>{actionLabel}</Text>
          </PressableScale>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    gap: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    padding: spacing.lg,
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    ...typography.body,
    fontFamily: 'Inter_600SemiBold',
  },
  message: {
    ...typography.caption,
  },
  action: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.chip,
  },
  actionLabel: {
    ...typography.caption,
    fontFamily: 'Inter_600SemiBold',
  },
});
