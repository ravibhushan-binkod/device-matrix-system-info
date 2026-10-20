import { Image, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/design-system/theme';

type Props = {
  /** `data:image/png;base64,…` icon, or null when Android did not provide one. */
  icon: string | null;
  label: string;
  size: number;
};

/** Launcher icon with a letter fallback when no icon could be read. */
export function AppIcon({ icon, label, size }: Props) {
  const { colors } = useTheme();
  const shape = { width: size, height: size, borderRadius: Math.round(size * 0.24) };

  if (icon) {
    return <Image source={{ uri: icon }} style={shape} accessibilityIgnoresInvertColors />;
  }

  return (
    <View
      style={[
        styles.fallback,
        shape,
        { backgroundColor: colors.surface2, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.letter, { color: colors.accent, fontSize: Math.round(size * 0.38) }]}>
        {label.trim().charAt(0).toUpperCase() || '?'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  letter: {
    fontFamily: 'Inter_600SemiBold',
  },
});
