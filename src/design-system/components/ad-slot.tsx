import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/design-system/theme';
import { radius, spacing, typography } from '@/design-system/tokens';

type Props = {
  /** Reserved height so real ads will not shift the layout (default 64). */
  height?: number;
  label?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Empty, reserved ad space. Ads are added later — this placeholder keeps the
 * layout stable and reminds that the ad rules apply (never on splash,
 * permission sheets, settings, full-screen tests or live graphs).
 */
export function AdSlot({ height = 64, label = 'Ad space reserved', style }: Props) {
  const { colors } = useTheme();

  return (
    <View
      accessibilityRole="none"
      accessible={false}
      style={[
        styles.slot,
        { height, borderColor: colors.border, backgroundColor: colors.surface2 },
        style,
      ]}
    >
      <Text style={[styles.label, { color: colors.muted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.button,
    borderWidth: 1,
    borderStyle: 'dashed',
    paddingHorizontal: spacing.lg,
  },
  label: {
    ...typography.caption,
  },
});
