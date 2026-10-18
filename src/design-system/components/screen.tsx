import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import type { ReactNode } from 'react';

import { useTheme } from '@/design-system/theme';
import { spacing } from '@/design-system/tokens';

type Props = {
  children: ReactNode;
  /** Wrap the content in a ScrollView. */
  scroll?: boolean;
  /** Horizontal padding on the 4 dp grid (default 16). */
  padded?: boolean;
  /** Include the top safe-area edge (for screens without a navigation header). */
  edgeTop?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
};

/** Standard screen container: themed background, safe area and optional scroll. */
export function Screen({
  children,
  scroll = false,
  padded = true,
  edgeTop = false,
  style,
  contentStyle,
}: Props) {
  const { colors } = useTheme();
  const padding = padded ? styles.padded : null;
  const edges: Edge[] = edgeTop ? ['top', 'left', 'right', 'bottom'] : ['left', 'right', 'bottom'];

  return (
    <SafeAreaView
      edges={edges}
      style={[styles.root, { backgroundColor: colors.background }, style]}
    >
      {scroll ? (
        <ScrollView
          contentContainerStyle={[padding, contentStyle]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, padding, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  padded: {
    paddingHorizontal: spacing.lg,
  },
});
