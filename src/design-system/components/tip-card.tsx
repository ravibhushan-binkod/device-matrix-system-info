import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/design-system/animations/pressable-scale';
import { withAlpha } from '@/design-system/color';
import { Icon, type IconName } from '@/design-system/icon';
import { useTheme } from '@/design-system/theme';
import { radius, spacing, typography, type AppColors } from '@/design-system/tokens';

type Tone = 'accent' | 'good' | 'warning' | 'critical';

type Props = {
  title: string;
  body: string;
  icon?: IconName;
  /** Colour family — matches the tip severity (default: accent). */
  tone?: Tone;
  /** Optional small line under the body, e.g. "3 tips — tap to see all". */
  hint?: string;
  /** Makes the whole card pressable (with scale + haptic feedback). */
  onPress?: () => void;
  /** Shows a "Got it" dismiss action. */
  onDismiss?: () => void;
};

function toneColor(colors: AppColors, tone: Tone): string {
  switch (tone) {
    case 'good':
      return colors.good;
    case 'warning':
      return colors.warning;
    case 'critical':
      return colors.critical;
    default:
      return colors.accent;
  }
}

/** Tinted tip card (honest, non-actionable advice only). */
export function TipCard({
  title,
  body,
  icon = 'tips',
  tone = 'accent',
  hint,
  onPress,
  onDismiss,
}: Props) {
  const { colors } = useTheme();
  const color = toneColor(colors, tone);

  const content = (
    <>
      <View style={[styles.badge, { backgroundColor: withAlpha(color, 0.16) }]}>
        <Icon name={icon} size={20} color={color} />
      </View>
      <View style={styles.text}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.body, { color: colors.muted }]}>{body}</Text>
        {hint ? <Text style={[styles.hint, { color }]}>{hint}</Text> : null}
      </View>
      {onDismiss ? (
        <PressableScale onPress={onDismiss} accessibilityRole="button" style={styles.dismiss}>
          <Text style={[styles.dismissLabel, { color }]}>Got it</Text>
        </PressableScale>
      ) : null}
    </>
  );

  const cardStyle = [
    styles.card,
    { backgroundColor: withAlpha(color, 0.08), borderColor: withAlpha(color, 0.24) },
  ];

  if (onPress) {
    return (
      <PressableScale onPress={onPress} accessibilityRole="button" style={cardStyle}>
        {content}
      </PressableScale>
    );
  }

  return <View style={cardStyle}>{content}</View>;
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
  hint: {
    ...typography.caption,
    fontFamily: 'Inter_600SemiBold',
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
