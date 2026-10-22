import { LinearGradient } from 'expo-linear-gradient';
import { Link, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import {
  forceEeaConsentTest,
  openAdInspector,
  resetConsent,
  showPrivacyOptions,
} from '@/core/ads/consent';
import { features, isEnabled } from '@/core/features';
import { getSystemAccentPalette, systemAccentSupported } from '@/core/native';
import { useMotionPreference } from '@/design-system/animations/use-motion-preference';
import { PressableScale } from '@/design-system/animations/pressable-scale';
import type { MotionMode } from '@/design-system/animations/motion';
import { withAlpha } from '@/design-system/color';
import { Button, Card, Chip, Screen, SectionHeader } from '@/design-system/components';
import { Icon } from '@/design-system/icon';
import { LiveGraph } from '@/design-system/visuals/live-graph';
import { Ring } from '@/design-system/visuals/ring';
import { useTheme, type ThemeMode } from '@/design-system/theme';
import { ACCENT_NAMES, accents, spacing, typography } from '@/design-system/tokens';
import { getDashboardTileDefinition } from '@/features/dashboard/services/dashboard-tiles';
import { useAdsStore, type AdsStatus } from '@/state/ads-store';
import { useDashboardLayoutStore } from '@/state/dashboard-store';
import { useSettingsStore } from '@/state/settings-store';

const themeModes: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
];

const animationModes: { value: MotionMode; label: string }[] = [
  { value: 'full', label: 'Full' },
  { value: 'reduced', label: 'Reduced' },
  { value: 'off', label: 'Off' },
];

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
  const animationMode = useSettingsStore((state) => state.animationMode);
  const setAnimationMode = useSettingsStore((state) => state.setAnimationMode);
  const motion = useMotionPreference();
  const systemAccents = systemAccentSupported();
  const systemPalette = systemAccents ? getSystemAccentPalette() : null;

  const tiles = useDashboardLayoutStore((state) => state.tiles);
  const toggleTile = useDashboardLayoutStore((state) => state.toggleTile);
  const moveTile = useDashboardLayoutStore((state) => state.moveTile);
  const resetTiles = useDashboardLayoutStore((state) => state.resetTiles);

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
          {ACCENT_NAMES.map((name) => (
            <Chip
              key={name}
              label={name.charAt(0).toUpperCase() + name.slice(1)}
              dotColor={accents[name][scheme]}
              selected={accent === name}
              onPress={() => setAccent(name)}
            />
          ))}
          {systemAccents ? (
            <Chip
              label="System colours"
              dotColor={
                systemPalette
                  ? scheme === 'dark'
                    ? systemPalette.accentDark
                    : systemPalette.accentLight
                  : undefined
              }
              selected={accent === 'system'}
              onPress={() => setAccent('system')}
            />
          ) : null}
        </View>
        <Text style={[styles.note, { color: colors.muted }]}>
          {accent === 'system' && !systemAccents
            ? 'System colours need Android 12 or newer. Cyan is used instead.'
            : systemAccents
              ? 'System colours follow the accent Android is using on this phone.'
              : 'Eight palettes. System colours become available on Android 12 and newer.'}
        </Text>
      </Card>

      <SectionHeader title="Preview" />
      <AccentPreview />

      <SectionHeader title="Dashboard" />
      <Card contentStyle={styles.tileList}>
        <Text style={[typography.body, { color: colors.muted }]}>
          Choose which tiles Home shows and the order they appear in. Hidden tiles keep their
          position.
        </Text>
        {tiles.map((tile, index) => {
          const definition = getDashboardTileDefinition(tile.id);
          return (
            <View
              key={tile.id}
              style={[
                styles.tileRow,
                index > 0 && {
                  borderTopColor: colors.border,
                  borderTopWidth: StyleSheet.hairlineWidth,
                },
              ]}
            >
              <View style={[styles.tileIcon, { backgroundColor: withAlpha(colors.accent, 0.1) }]}>
                <Icon name={definition.icon} size={16} color={colors.accent} />
              </View>
              <View style={styles.tileCopy}>
                <Text numberOfLines={1} style={[typography.body, { color: colors.text }]}>
                  {definition.shortTitle}
                </Text>
                <Text style={[typography.caption, { color: colors.muted }]}>
                  {definition.size.toUpperCase()} tile
                </Text>
              </View>
              <PressableScale
                onPress={() => moveTile(tile.id, 'up')}
                disabled={index === 0}
                haptic={false}
                accessibilityRole="button"
                accessibilityLabel={`Move ${definition.shortTitle} up`}
                hitSlop={6}
                style={[styles.reorder, index === 0 && styles.reorderDisabled]}
              >
                <Text style={[styles.reorderText, { color: colors.muted }]}>↑</Text>
              </PressableScale>
              <PressableScale
                onPress={() => moveTile(tile.id, 'down')}
                disabled={index === tiles.length - 1}
                haptic={false}
                accessibilityRole="button"
                accessibilityLabel={`Move ${definition.shortTitle} down`}
                hitSlop={6}
                style={[styles.reorder, index === tiles.length - 1 && styles.reorderDisabled]}
              >
                <Text style={[styles.reorderText, { color: colors.muted }]}>↓</Text>
              </PressableScale>
              <Switch
                value={tile.visible}
                onValueChange={() => toggleTile(tile.id)}
                accessibilityLabel={`Show ${definition.shortTitle} on Home`}
                trackColor={{ false: colors.surface2, true: withAlpha(colors.accent, 0.45) }}
                thumbColor={tile.visible ? colors.accent : colors.muted}
              />
            </View>
          );
        })}
        <Button title="Reset layout" variant="ghost" icon="refresh" onPress={resetTiles} />
      </Card>

      <SectionHeader title="Animations" />
      <Card contentStyle={styles.stack}>
        <View style={styles.row}>
          {animationModes.map((mode) => (
            <Chip
              key={mode.value}
              label={mode.label}
              selected={animationMode === mode.value}
              onPress={() => setAnimationMode(mode.value)}
            />
          ))}
        </View>
        <Text style={[typography.body, { color: colors.muted }]}>
          {motion.source === 'system'
            ? 'Android’s Reduce motion setting is on, so Full plays as Reduced. Your choice is saved.'
            : motion.source === 'performance'
              ? 'Reduced was switched on for this session because the phone dropped frames. Your saved choice is still Full.'
              : animationMode === 'full'
                ? 'Movement, live loops, parallax and chart drawing are on.'
                : animationMode === 'reduced'
                  ? 'Short opacity fades only — live loops, particles and parallax are paused.'
                  : 'Everything renders immediately, with no animation at all.'}
        </Text>
      </Card>

      <SectionHeader title="More" />
      <Card>
        <Text style={[typography.body, { color: colors.muted }]}>
          Theme, accent, dashboard layout and animation choices are saved on this phone.
        </Text>
      </Card>

      <SectionHeader title="Privacy" />
      <Card contentStyle={styles.stack}>
        <Link href={'/privacy' as Href} style={[styles.devLink, { color: colors.accent }]}>
          Privacy policy
        </Link>
        <Text style={[typography.caption, { color: colors.muted }]}>
          Readings stay on this phone. Ads are served by Google AdMob and never appear on report,
          settings or full-screen test screens.
        </Text>
        {isEnabled(features.ads) ? (
          <Button
            title="Ad privacy options"
            icon="info"
            variant="secondary"
            disabled={adsBusy}
            onPress={() => void runAdsAction(showPrivacyOptions, 'Privacy options closed.')}
          />
        ) : null}
        {adsNotice ? (
          <Text style={[styles.notice, { color: colors.muted }]}>{adsNotice}</Text>
        ) : null}
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
        <View style={styles.devLinks}>
          <Link href="/dev/gallery" style={[styles.devLink, { color: colors.accent }]}>
            Open design gallery
          </Link>
          <Link href="/dev/support-matrix" style={[styles.devLink, { color: colors.accent }]}>
            Open support matrix
          </Link>
        </View>
      ) : null}
    </Screen>
  );
}

function AccentPreview() {
  const { colors } = useTheme();

  return (
    <Card contentStyle={styles.preview}>
      <View style={styles.previewRow}>
        <Ring value={72} size={92} thickness={8} color={colors.accent} displayValue="72" />
        <View style={styles.previewRight}>
          <LinearGradient
            colors={[withAlpha(colors.accent, 0.34), withAlpha(colors.violet, 0.08)]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.previewGradient}
          >
            <View style={styles.previewIcons}>
              <Icon name="cpu" size={20} color={colors.accent} />
              <Icon name="battery" size={20} color={colors.violet} />
              <Icon name="wifi" size={20} color={colors.accent} />
            </View>
          </LinearGradient>
          <LiveGraph data={[3, 5, 4, 7, 6, 8]} height={46} color={colors.accent} />
        </View>
      </View>
      <Text style={[styles.previewNote, { color: colors.muted }]}>
        Rings, gradients, charts and icons pick up this accent immediately.
      </Text>
    </Card>
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
  devLinks: {
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  devLink: {
    ...typography.body,
    textDecorationLine: 'underline',
  },
  tileList: {
    gap: spacing.sm,
  },
  tileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  tileIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileCopy: {
    flex: 1,
  },
  reorder: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reorderDisabled: {
    opacity: 0.3,
  },
  reorderText: {
    ...typography.title,
  },
  stack: {
    gap: spacing.sm,
  },
  preview: {
    gap: spacing.md,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  previewRight: {
    flex: 1,
    gap: spacing.sm,
  },
  previewGradient: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  previewIcons: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  previewNote: {
    ...typography.caption,
  },
  note: {
    ...typography.caption,
    marginTop: spacing.sm,
  },
});
