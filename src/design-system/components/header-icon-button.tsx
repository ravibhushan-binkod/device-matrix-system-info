import { Pressable, StyleSheet } from 'react-native';

import { Icon, type IconName } from '@/design-system/icon';
import { useTheme } from '@/design-system/theme';
import { spacing } from '@/design-system/tokens';

type Props = {
  name: IconName;
  label: string;
  onPress: () => void;
};

/** Icon-only button used in navigation headers (e.g. the settings gear). */
export function HeaderIconButton({ name, label, onPress }: Props) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.button, { opacity: pressed ? 0.55 : 1 }]}
    >
      <Icon name={name} size={24} color={colors.text} />
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
