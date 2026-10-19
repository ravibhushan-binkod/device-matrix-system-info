import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { forceEeaConsentTest, openAdInspector, resetConsent } from '@/core/ads/consent';
import { features, isEnabled } from '@/core/features';
import { Button, Card, Chip, Screen, SectionHeader } from '@/design-system/components';
import { useTheme, type ThemeMode } from '@/design-system/theme';
import { accents, spacing, typography, type AccentName } from '@/design-system/tokens';
import { useAdsStore, type AdsStatus } from '@/state/ads-store';
import { useSettingsStore } from '@/state/settings-store';

const themeModes: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
];

const accentNames: AccentName[] = ['cyan', 'blue', 'violet', 'green'];

const adsStatusLabels: Record<AdsStatus, string> = {
  idle: 'idle',
  running: 'starting…',
  ready: 'ready — banners can load',
  blocked: 'no consent — banners stay hidden',
  error: 'unavailable — banners stay hidden',
  disabled: 'disabled',
};

export default function SettingsScreen() {
  const { colors, scheme } = useTheme();
  const themeMode = useSettingsStore((state) => state.themeMode);
  const accent = useSettingsStore((state) => state.accent);
  const setThemeMode = useSettingsStore((state) => state.setThemeMode);
  const setAccent = useSettingsStore((state) => state.setAccent);

  const adsStatus = useAdsStore((state) => state.status);
  const [adsNotice, setAdsNotice] = useState<string | null>(null);
  const [adsBusy, setAdsBusy] = useState(false);

  const runAdsAction = async (action: () => Promise<void>, done: string) => {
    setAdsBusy(true);
    setAdsNotice(null);
    try {
      await action();
      setAdsNotice(done);
    } catch (error) {
      setAdsNotice(error instanceof Error ? error.message : String(error));
    } finally {
      setAdsBusy(false);
    }
  };

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
              dotColor={accents[name][scheme]}
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

      {isEnabled(features.adDebugTools) ? (
        <>
          <SectionHeader title="Developer" />
          <Card>
            <Text style={[typography.body, { color: colors.muted }]}>
              Ads: {adsStatusLabels[adsStatus]}. Test ads only — never tap live ads during
              development.
            </Text>
            <View style={styles.actions}>
              <Button
                title="Reset consent"
                icon="settings"
                variant="secondary"
                disabled={adsBusy}
                onPress={() =>
                  void runAdsAction(
                    resetConsent,
                    'Consent reset. The next ad request asks for consent again.',
                  )
                }
              />
              <Button
                title="Ad Inspector"
                icon="search"
                variant="secondary"
                disabled={adsBusy}
                onPress={() => void runAdsAction(openAdInspector, 'Ad Inspector opened.')}
              />
              <Button
                title="Force EEA consent test"
                icon="info"
                variant="secondary"
                disabled={adsBusy}
                onPress={() =>
                  void runAdsAction(
                    forceEeaConsentTest,
                    'EEA test geography enabled — the consent form appears for test devices.',
                  )
                }
              />
            </View>
            {adsNotice ? (
              <Text style={[styles.notice, { color: colors.muted }]}>{adsNotice}</Text>
            ) : null}
          </Card>
        </>
      ) : null}

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
  actions: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  notice: {
    ...typography.caption,
    marginTop: spacing.sm,
  },
  devLink: {
    ...typography.body,
    marginTop: spacing.xl,
    textDecorationLine: 'underline',
  },
});
