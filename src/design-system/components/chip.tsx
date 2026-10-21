import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/design-system/animations/pressable-scale';
import { Icon, type IconName } from '@/design-system/icon';
import { useTheme } from '@/design-system/theme';
import { radius, spacing, typography } from '@/design-system/tokens';

type Props = {
  label: string;
  selected?: boolean;
  /** Optional colour dot (e.g. storage legends). */
  dotColor?: string;
  icon?: IconName;
  onPress?: () => void;
  /** Optional long-press action (chips that stand for a copyable value). */
  onLongPress?: () => void;
};

/** Pill chip — filter, legend or selection. */
export function Chip({ label, selected = false, dotColor, icon, onPress, onLongPress }: Props) {
  const { colors } = useTheme();
  const fg = selected ? colors.onPrimary : colors.muted;

  const body = (
    <>
      {dotColor ? <View style={[styles.dot, { backgroundColor: dotColor }]} /> : null}
      {icon ? <Icon name={icon} size={16} color={fg} /> : null}
      <Text style={[styles.label, { color: fg }]}>{label}</Text>
    </>
  );

  const chipStyle = [
    styles.chip,
    {
      backgroundColor: selected ? colors.primarySolid : colors.surface2,
      borderColor: colors.border,
      borderWidth: selected ? 0 : 1,
    },
  ];

  if (onPress || onLongPress) {
    return (
      <PressableScale
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={320}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityHint={onLongPress ? 'Long press to copy this value' : undefined}
        hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        style={chipStyle}
      >
        {body}
      </PressableScale>
    );
  }

  return <View style={chipStyle}>{body}</View>;
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderRadius: radius.chip,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    ...typography.caption,
    fontFamily: 'Inter_600SemiBold',
  },
});
