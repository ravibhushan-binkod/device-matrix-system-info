import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';

import { PressableScale } from '@/design-system/animations/pressable-scale';
import { useTheme } from '@/design-system/theme';
import { radius, spacing } from '@/design-system/tokens';

type Props = {
  children: ReactNode;
  /** Makes the whole card pressable (with scale + haptic feedback). */
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

/** Glass-style card: subtle border + diagonal gradient over the surface. */
export function Card({ children, onPress, style }: Props) {
  const { colors } = useTheme();
  const base: StyleProp<ViewStyle> = [
    styles.card,
    { borderColor: colors.border, backgroundColor: colors.surface },
    style,
  ];

  const content = (
    <>
      <LinearGradient
        colors={[colors.glassFrom, colors.glassTo]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.inner}>{children}</View>
    </>
  );

  if (onPress) {
    return (
      <PressableScale onPress={onPress} style={base}>
        {content}
      </PressableScale>
    );
  }

  return <View style={base}>{content}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    overflow: 'hidden',
  },
  inner: {
    padding: spacing.lg,
  },
});
