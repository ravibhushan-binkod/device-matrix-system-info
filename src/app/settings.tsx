import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Card, Chip, Screen, SectionHeader } from '@/design-system/components';
import { useTheme, type ThemeMode } from '@/design-system/theme';
import { accents, spacing, typography, type AccentName } from '@/design-system/tokens';
import { useSettingsStore } from '@/state/settings-store';

const themeModes: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
];

const accentNames: AccentName[] = ['cyan', 'blue', 'violet', 'green'];

export default function SettingsScreen() {
  const { colors } = useTheme();
  const themeMode = useSettingsStore((state) => state.themeMode);
  const accent = useSettingsStore((state) => state.accent);
  const setThemeMode = useSettingsStore((state) => state.setThemeMode);
  const setAccent = useSettingsStore((state) => state.setAccent);

  return (
    <Screen scroll contentStyle={{ paddingBottom: spacing.xxl }}>
      <SectionHeader title="Appearance" />
      <Card>
        <Text style={[styles.label, { color: colors.muted }]}>Theme</Text>
        <View style={styles.row}>
          {themeModes.map((mode) => (
            <Chip
              key={mode.value}
              label={mode.label}
              selected={themeMode === mode.value}
              onPress={() => setThemeMode(mode.value)}
            />
          ))}
        </View>
        <Text style={[styles.label, styles.spaced, { color: colors.muted }]}>Accent</Text>
        <View style={styles.row}>
          {accentNames.map((name) => (
            <Chip
              key={name}
              label={name.charAt(0).toUpperCase() + name.slice(1)}
              dotColor={accents[name]}
              selected={accent === name}
              onPress={() => setAccent(name)}
            />
          ))}
        </View>
      </Card>

      <SectionHeader title="More" />
      <Card>
        <Text style={[typography.body, { color: colors.muted }]}>
          Units, polling speed and data preferences arrive with the settings phase.
        </Text>
      </Card>

      {__DEV__ ? (
        <Link href="/dev/gallery" style={[styles.devLink, { color: colors.accent }]}>
          Open design gallery
        </Link>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: {
    ...typography.caption,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  spaced: {
    marginTop: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  devLink: {
    ...typography.body,
    marginTop: spacing.xl,
    textDecorationLine: 'underline',
  },
});
