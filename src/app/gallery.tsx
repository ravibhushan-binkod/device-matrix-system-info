import { Redirect } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/design-system/theme';
import { palettes, radius, spacing } from '@/design-system/tokens';

const spacingSamples = [
  ['xs', spacing.xs],
  ['sm', spacing.sm],
  ['md', spacing.md],
  ['lg', spacing.lg],
  ['xl', spacing.xl],
] as const;

/** Dev-only design-system gallery: tokens, type scale and spacing. */
export default function GalleryScreen() {
  const { scheme, colors } = useAppTheme();

  // Never reachable in production builds.
  if (!__DEV__) {
    return <Redirect href="/" />;
  }

  const swatches = Object.entries(palettes[scheme]) as [string, string][];

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.heading, { color: colors.text }]}>Colors · {scheme}</Text>
      {swatches.map(([name, value]) => (
        <View key={name} style={styles.row}>
          <View style={[styles.swatch, { backgroundColor: value, borderColor: colors.border }]} />
          <Text style={[styles.mono, { color: colors.textMuted }]}>{name}</Text>
          <Text style={[styles.mono, styles.value, { color: colors.text }]}>{value}</Text>
        </View>
      ))}

      <Text style={[styles.heading, { color: colors.text }]}>Type</Text>
      <Text style={[styles.typeDisplay, { color: colors.text }]}>Inter SemiBold 22</Text>
      <Text style={[styles.typeBody, { color: colors.textMuted }]}>
        Inter Regular 15 — body copy
      </Text>
      <Text style={[styles.mono, { color: colors.accent }]}>JetBrains Mono 12 — values</Text>

      <Text style={[styles.heading, { color: colors.text }]}>Spacing</Text>
      {spacingSamples.map(([name, value]) => (
        <View key={name} style={styles.row}>
          <Text style={[styles.mono, styles.spacingName, { color: colors.textMuted }]}>{name}</Text>
          <View
            style={{ width: value, height: 12, borderRadius: 3, backgroundColor: colors.accent }}
          />
          <Text style={[styles.mono, { color: colors.text }]}>{value}dp</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  heading: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginTop: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  mono: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 12,
  },
  value: {
    marginLeft: 'auto',
  },
  spacingName: {
    width: 28,
  },
  typeDisplay: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 22,
  },
  typeBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 22,
  },
});
