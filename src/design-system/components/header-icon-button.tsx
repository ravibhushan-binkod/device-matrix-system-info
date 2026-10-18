import type { LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet } from 'react-native';

import { useAppTheme } from '@/design-system/theme';
import { spacing } from '@/design-system/tokens';

type Props = {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
};

/** Icon-only button used in navigation headers (e.g. the settings gear). */
export function HeaderIconButton({ icon: Icon, label, onPress }: Props) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.button, { opacity: pressed ? 0.55 : 1 }]}
    >
      <Icon size={22} color={colors.text} strokeWidth={2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
});
