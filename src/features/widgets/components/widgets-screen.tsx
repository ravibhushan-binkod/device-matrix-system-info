import { useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import {
  getSystemAccentPalette,
  getWidgetAppearance,
  setWidgetAppearance,
  type WidgetAccentName,
  type WidgetThemeChoice,
} from '@/core/native';
import { failureMessage } from '@/core/result';
import { useUnitsStore } from '@/core/units';
import { PressableScale } from '@/design-system/animations/pressable-scale';
import { Card, Chip, SectionHeader, Screen } from '@/design-system/components';
import { Icon } from '@/design-system/icon';
import { useTheme, type AccentChoice } from '@/design-system/theme';
import {
  ACCENT_NAMES,
  accents,
  radius,
  spacing,
  typography,
  type ColorScheme,
} from '@/design-system/tokens';
import { WidgetPreview } from '@/features/widgets/components/widget-preview';
import { useWidgetPreview } from '@/features/widgets/hooks/use-widget-preview';
import {
  WIDGET_SPECS,
  WIDGET_TEXT,
  formatWidgetTemperature,
  formatWidgetUpdated,
  type WidgetSpec,
} from '@/features/widgets/widget-spec';
import type { DashboardSummary } from '@/features/dashboard/types';

const THEMES: { value: WidgetThemeChoice; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const GAP = spacing.md;

function accentPair(
  choice: WidgetAccentName | 'match',
  appAccent: AccentChoice,
  appScheme: ColorScheme,
  appAccentColor: string,
): { light: string; dark: string } {
  if (choice !== 'match') return accents[choice];
  if (appAccent !== 'system') return accents[appAccent];
  const palette = getSystemAccentPalette();
  return {
    light: palette?.accentLight ?? appAccentColor,
    dark: palette?.accentDark ?? appAccentColor,
  };
}

function batteryTemperature(summary: DashboardSummary | null): number | null {
  return summary?.battery.status === 'ok' ? (summary.battery.value.temperatureC ?? null) : null;
}

export function WidgetsScreen() {
  const { colors, scheme, accent: appAccent } = useTheme();
  const summary = useWidgetPreview();
  const units = useUnitsStore((state) => state.units);
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);

  const [appearance, setAppearance] = useState<{
    theme: WidgetThemeChoice;
    accent: WidgetAccentName | 'match';
  }>(() => {
    const saved = getWidgetAppearance();
    if (saved.status === 'ok') {
      return { theme: saved.value.theme, accent: saved.value.accent };
    }
    return { theme: 'system', accent: 'match' };
  });
  const [index, setIndex] = useState(0);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const themeChoice = appearance.theme;
  const accentChoice = appearance.accent;

  const pageWidth = Math.max(240, width - spacing.lg * 2);
  const cellWidth = Math.min(82, pageWidth / 4);
  const pair = accentPair(accentChoice, appAccent, scheme, colors.accent);
  const previewScheme: ColorScheme =
    themeChoice === 'system' ? scheme : themeChoice === 'dark' ? 'dark' : 'light';
  const previewAccent = previewScheme === 'dark' ? pair.dark : pair.light;
  const temperature = batteryTemperature(summary);

  const chooseTheme = (theme: WidgetThemeChoice) => {
    setAppearance((previous) => ({ ...previous, theme }));
    const result = setWidgetAppearance({
      theme,
      accent: accentChoice,
      accentLight: accentChoice === 'match' ? pair.light : null,
      accentDark: accentChoice === 'match' ? pair.dark : null,
    });
    if (result.status === 'ok') {
      setSavedNote(
        result.value > 0
          ? `Saved for ${result.value} placed ${result.value === 1 ? 'widget' : 'widgets'}.`
          : 'Saved. New widgets will use this theme and accent.',
      );
    } else {
      setSavedNote(failureMessage(result));
    }
  };

  const chooseAccent = (choice: WidgetAccentName | 'match') => {
    setAppearance((previous) => ({ ...previous, accent: choice }));
    const nextPair = accentPair(choice, appAccent, scheme, colors.accent);
    const result = setWidgetAppearance({
      theme: themeChoice,
      accent: choice,
      accentLight: choice === 'match' ? nextPair.light : null,
      accentDark: choice === 'match' ? nextPair.dark : null,
    });
    if (result.status === 'ok') {
      setSavedNote(
        result.value > 0
          ? `Saved for ${result.value} placed ${result.value === 1 ? 'widget' : 'widgets'}.`
          : 'Saved. New widgets will use this theme and accent.',
      );
    } else {
      setSavedNote(failureMessage(result));
    }
  };

  const current: WidgetSpec = WIDGET_SPECS[index] ?? WIDGET_SPECS[0]!;

  const goTo = (next: number) => {
    const clamped = Math.max(0, Math.min(WIDGET_SPECS.length - 1, next));
    scrollRef.current?.scrollTo({ x: clamped * (pageWidth + GAP), animated: true });
    setIndex(clamped);
  };

  const onMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / (pageWidth + GAP));
    setIndex(Math.max(0, Math.min(WIDGET_SPECS.length - 1, next)));
  };

  const updatedLine = formatWidgetUpdated(summary?.generatedAt ?? null, units.timeFormat);
  const temperatureLine = formatWidgetTemperature(temperature, units.temperature);

  const accentOptions = useMemo(
    () =>
      ACCENT_NAMES.map((name) => ({
        name,
        label: name.charAt(0).toUpperCase() + name.slice(1),
        color: accents[name][scheme],
      })),
    [scheme],
  );

  return (
    <Screen scroll contentStyle={styles.content}>
      <Card contentStyle={styles.liveCard}>
        <View style={styles.liveRow}>
          <View style={styles.liveLabel}>
            <View style={[styles.liveDot, { backgroundColor: colors.good }]} />
            <Text style={[styles.liveTitle, { color: colors.text }]}>Live preview</Text>
          </View>
          <Text style={[styles.liveValue, { color: colors.muted }]}>{updatedLine}</Text>
        </View>
        <View style={styles.liveRow}>
          <Text style={[styles.liveLabelText, { color: colors.muted }]}>
            {WIDGET_TEXT.batteryTemperature}
          </Text>
          <Text style={[styles.liveValue, { color: colors.text }]}>{temperatureLine}</Text>
        </View>
        <Text style={[styles.liveNote, { color: colors.muted }]}>
          Values are read on this phone and refresh while this screen is open. The home screens
          update on the launcher&apos;s schedule.
        </Text>
      </Card>

      <SectionHeader title="How to add a widget" />
      <Card contentStyle={styles.stepsCard}>
        <Step number="1" text="Touch and hold an empty area of your Home screen." />
        <Step number="2" text="Choose Widgets, find Device Matrix, then pick a size." />
        <Step
          number="3"
          text="Drag the widget where you want it. Touch and hold again to resize."
        />
        <Text style={[styles.note, { color: colors.muted }]}>
          Android and your launcher decide when a widget refreshes. Device Matrix asks for an update
          every 30 minutes, but some launchers wait longer. Tap the refresh arrow on a widget to
          update it immediately. A widget shows the values from its last update and cannot be added
          from inside this app.
        </Text>
      </Card>

      <SectionHeader title="Appearance" />
      <Card contentStyle={styles.controls}>
        <Text style={[styles.controlLabel, { color: colors.muted }]}>Theme</Text>
        <View style={styles.chips}>
          {THEMES.map((theme) => (
            <Chip
              key={theme.value}
              label={theme.label}
              selected={themeChoice === theme.value}
              onPress={() => chooseTheme(theme.value)}
            />
          ))}
        </View>

        <Text style={[styles.controlLabel, styles.spaced, { color: colors.muted }]}>Accent</Text>
        <View style={styles.chips}>
          <Chip
            label="Match app"
            icon="palette"
            dotColor={colors.accent}
            selected={accentChoice === 'match'}
            onPress={() => chooseAccent('match')}
          />
          {accentOptions.map((option) => (
            <Chip
              key={option.name}
              label={option.label}
              dotColor={option.color}
              selected={accentChoice === option.name}
              onPress={() => chooseAccent(option.name)}
            />
          ))}
        </View>
        <Text style={[styles.note, { color: colors.muted }]}>
          Theme and accent update the preview at once and are saved for the home-screen widgets.
          Each placed widget keeps the background transparency and motion choice from its own
          settings.
        </Text>
        {savedNote ? (
          <Text accessibilityLiveRegion="polite" style={[styles.saved, { color: colors.muted }]}>
            {savedNote}
          </Text>
        ) : null}
      </Card>

      <View style={styles.sliderHeader}>
        <View>
          <SectionHeader title="Widget sizes" />
          <Text style={[styles.sliderHint, { color: colors.muted }]}>
            Swipe through all ten at their real proportions.
          </Text>
        </View>
        <View style={styles.arrows}>
          <PressableScale
            onPress={() => goTo(index - 1)}
            disabled={index === 0}
            accessibilityRole="button"
            accessibilityLabel="Previous widget size"
            style={[styles.arrow, index === 0 && styles.disabled]}
          >
            <Icon name="back" size={20} color={colors.text} />
          </PressableScale>
          <PressableScale
            onPress={() => goTo(index + 1)}
            disabled={index === WIDGET_SPECS.length - 1}
            accessibilityRole="button"
            accessibilityLabel="Next widget size"
            style={[styles.arrow, index === WIDGET_SPECS.length - 1 && styles.disabled]}
          >
            <Icon name="chevron-right" size={20} color={colors.text} />
          </PressableScale>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={pageWidth + GAP}
        decelerationRate="fast"
        onMomentumScrollEnd={onMomentumEnd}
        contentContainerStyle={styles.slider}
        accessibilityLabel="Widget size previews"
      >
        {WIDGET_SPECS.map((spec) => (
          <View key={spec.id} style={[styles.page, { width: pageWidth }]}>
            <View style={styles.pageHeader}>
              <Text style={[styles.pageTitle, { color: colors.text }]}>{spec.title}</Text>
              <Text style={[styles.pageSize, { color: colors.muted }]}>
                {spec.widthCells} × {spec.heightCells}
              </Text>
            </View>
            <WidgetPreview
              spec={spec}
              summary={summary}
              scheme={previewScheme}
              accent={previewAccent}
              units={units}
              width={Math.round(cellWidth * spec.widthCells)}
            />
            <Text style={[styles.pageDescription, { color: colors.muted }]}>
              {spec.description}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.pager}>
        <Text style={[styles.pagerText, { color: colors.muted }]}>
          {index + 1} / {WIDGET_SPECS.length}
        </Text>
        <View style={styles.dots}>
          {WIDGET_SPECS.map((spec, dotIndex) => (
            <Pressable
              key={spec.id}
              accessibilityRole="button"
              accessibilityLabel={`Show ${spec.title}`}
              accessibilityState={{ selected: dotIndex === index }}
              onPress={() => goTo(dotIndex)}
              hitSlop={6}
              style={[
                styles.dot,
                {
                  backgroundColor: dotIndex === index ? colors.accent : colors.border,
                  width: dotIndex === index ? 16 : 6,
                },
              ]}
            />
          ))}
        </View>
      </View>

      <Text style={[styles.footer, { color: colors.muted }]}>
        {current.title} is shown at {current.widthCells} × {current.heightCells} cells. Sizes are
        set by Android&apos;s launcher grid; the actual pixel size depends on your phone.
      </Text>
    </Screen>
  );
}

function Step({ number, text }: { number: string; text: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.step}>
      <View style={[styles.stepNumber, { backgroundColor: colors.surface2 }]}>
        <Text style={[styles.stepNumberText, { color: colors.accent }]}>{number}</Text>
      </View>
      <Text style={[styles.stepText, { color: colors.text }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  liveCard: {
    gap: spacing.sm,
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  liveLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveTitle: {
    ...typography.body,
    fontFamily: 'Inter_600SemiBold',
  },
  liveLabelText: {
    ...typography.caption,
  },
  liveValue: {
    ...typography.mono,
  },
  liveNote: {
    ...typography.caption,
    lineHeight: 18,
  },
  stepsCard: {
    gap: spacing.md,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    ...typography.caption,
    fontFamily: 'Inter_700Bold',
  },
  stepText: {
    ...typography.body,
    flex: 1,
    lineHeight: 22,
    paddingTop: 3,
  },
  note: {
    ...typography.caption,
    lineHeight: 18,
  },
  controls: {
    gap: spacing.sm,
  },
  controlLabel: {
    ...typography.caption,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  spaced: {
    marginTop: spacing.md,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  saved: {
    ...typography.caption,
  },
  sliderHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  sliderHint: {
    ...typography.caption,
    marginTop: -spacing.sm,
  },
  arrows: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingBottom: 2,
  },
  arrow: {
    width: 40,
    height: 40,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.3,
  },
  slider: {
    gap: GAP,
  },
  page: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  pageHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  pageTitle: {
    ...typography.body,
    fontFamily: 'Inter_600SemiBold',
    flexShrink: 1,
  },
  pageSize: {
    ...typography.caption,
    fontFamily: 'JetBrainsMono_400Regular',
  },
  pageDescription: {
    ...typography.caption,
    lineHeight: 18,
    textAlign: 'center',
  },
  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  pagerText: {
    ...typography.caption,
    fontFamily: 'JetBrainsMono_400Regular',
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  footer: {
    ...typography.caption,
    lineHeight: 18,
    textAlign: 'center',
  },
});
