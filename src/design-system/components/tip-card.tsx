import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/design-system/animations/pressable-scale';
import { withAlpha } from '@/design-system/color';
import { Icon, type IconName } from '@/design-system/icon';
import { useTheme } from '@/design-system/theme';
import { radius, spacing, typography } from '@/design-system/tokens';

type Props = {
  title: string;
  body: string;
  icon?: IconName;
  /** Shows a "Got it" dismiss action. */
  onDismiss?: () => void;
};

/** Accent-tinted tip card (honest, non-actionable advice only). */
export function TipCard({ title, body, icon = 'tips', onDismiss }: Props) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: withAlpha(colors.accent, 0.08),
          borderColor: withAlpha(colors.accent, 0.24),
        },
      ]}
    >
      <View style={[styles.badge, { backgroundColor: withAlpha(colors.accent, 0.16) }]}>
        <Icon name={icon} size={20} color={colors.accent} />
      </View>
      <View style={styles.text}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.body, { color: colors.muted }]}>{body}</Text>
      </View>
      {onDismiss ? (
        <PressableScale onPress={onDismiss} accessibilityRole="button" style={styles.dismiss}>
          <Text style={[styles.dismissLabel, { color: colors.accent }]}>Got it</Text>
        </PressableScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  body: {
    ...typography.caption,
  },
  dismiss: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.chip,
  },
  dismissLabel: {
    ...typography.caption,
    fontFamily: 'Inter_600SemiBold',
  },
});
