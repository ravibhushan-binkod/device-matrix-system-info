import { StyleSheet, Text } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { PressableScale } from '@/design-system/animations/pressable-scale';
import { Icon, type IconName } from '@/design-system/icon';
import { useTheme } from '@/design-system/theme';
import { radius, spacing, typography } from '@/design-system/tokens';

type Variant = 'primary' | 'secondary' | 'ghost';

type Props = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  icon?: IconName;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Standard button — primary (filled), secondary (tonal) or ghost. */
export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  disabled = false,
  style,
}: Props) {
  const { colors } = useTheme();

  const fg =
    variant === 'primary' ? colors.onPrimary : variant === 'ghost' ? colors.primary : colors.text;
  const background =
    variant === 'primary'
      ? colors.primarySolid
      : variant === 'secondary'
        ? colors.surface2
        : 'transparent';
  const border = variant === 'secondary' ? colors.border : 'transparent';

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={[
        styles.button,
        { backgroundColor: background, borderColor: border },
        disabled && styles.disabled,
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={20} color={fg} /> : null}
      <Text style={[styles.label, { color: fg }]}>{title}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 48,
    borderWidth: 1,
    borderRadius: radius.button,
    paddingHorizontal: spacing.lg,
  },
  label: {
    ...typography.body,
    fontFamily: 'Inter_600SemiBold',
  },
  disabled: {
    opacity: 0.5,
  },
});
