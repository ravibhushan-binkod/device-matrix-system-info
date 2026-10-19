import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PressableScale } from '@/design-system/animations/pressable-scale';
import { Icon } from '@/design-system/icon';
import { radius, spacing, typography } from '@/design-system/tokens';

type TestColor = {
  name: string;
  hex: string;
  /** Readable text on this background. */
  text: string;
  /** Whether the status bar icons should be dark. */
  dark: boolean;
};

const TEST_COLORS: readonly TestColor[] = [
  { name: 'White', hex: '#FFFFFF', text: '#0B0F14', dark: true },
  { name: 'Black', hex: '#000000', text: '#E8EEF5', dark: false },
  { name: 'Red', hex: '#FF0000', text: '#FFFFFF', dark: false },
  { name: 'Green', hex: '#00FF00', text: '#0B0F14', dark: true },
  { name: 'Blue', hex: '#0000FF', text: '#FFFFFF', dark: false },
  { name: 'Grey', hex: '#808080', text: '#0B0F14', dark: true },
];

/**
 * Colour and dead-pixel test: full-screen solid colours, tap anywhere for the
 * next one. White shows dead pixels, black shows stuck ones.
 */
export function ScreenTestScreen() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const color = TEST_COLORS[index] ?? TEST_COLORS[0];
  if (!color) return null;

  const next = () => setIndex((current) => (current + 1) % TEST_COLORS.length);

  const hint =
    color.name === 'White'
      ? 'Look for dark dots — dead pixels.'
      : color.name === 'Black'
        ? 'Look for bright dots — stuck pixels.'
        : 'Tap anywhere for the next colour.';

  return (
    <Pressable
      style={[styles.root, { backgroundColor: color.hex }]}
      onPress={next}
      accessibilityRole="button"
      accessibilityLabel={`Next colour. Now showing ${color.name}.`}
    >
      <StatusBar style={color.dark ? 'dark' : 'light'} />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <PressableScale
            onPress={() => router.back()}
            accessibilityRole="button"
            style={styles.close}
          >
            <Icon name="x" size={20} color="#FFFFFF" />
          </PressableScale>
          <Text style={[styles.progress, { color: color.text }]}>
            {index + 1} / {TEST_COLORS.length}
          </Text>
        </View>

        <View style={styles.center} pointerEvents="none">
          <Text style={[styles.name, { color: color.text }]}>{color.name}</Text>
          <Text style={[styles.hint, { color: color.text }]}>{hint}</Text>
        </View>
      </SafeAreaView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  close: {
    width: 40,
    height: 40,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(11,15,20,0.35)',
  },
  progress: {
    ...typography.caption,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  name: {
    ...typography.display,
  },
  hint: {
    ...typography.body,
    textAlign: 'center',
  },
});
