import * as Application from 'expo-application';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { systemAccentSupported } from '@/core/native';
import { useMotionPreference } from '@/design-system/animations/use-motion-preference';
import { PressableScale } from '@/design-system/animations/pressable-scale';
import type { MotionMode } from '@/design-system/animations/motion';
import { withAlpha } from '@/design-system/color';
import { Button, Card, Chip, Screen, SectionHeader } from '@/design-system/components';
import { Icon, type IconName } from '@/design-system/icon';
import { useTheme, type ThemeMode } from '@/design-system/theme';
import { ACCENT_NAMES, accents, spacing, typography } from '@/design-system/tokens';
import {
  getDashboardSectionDefinition,
  type DashboardSectionPreference,
} from '@/features/dashboard/services/dashboard-sections';
import { getDashboardTileDefinition } from '@/features/dashboard/services/dashboard-tiles';
import { UnitsSettings } from '@/features/settings/components/units-screen';
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

type LayoutRowProps = {
  icon: IconName;
  title: string;
  subtitle: string;
  visible: boolean;
  first: boolean;
  last: boolean;
  onToggle: () => void;
  onUp: () => void;
  onDown: () => void;
};

function LayoutRow({
  icon,
  title,
  subtitle,
  visible,
  first,
  last,
  onToggle,
  onUp,
  onDown,
}: LayoutRowProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.layoutRow, { borderTopColor: colors.border }]}>
      <View style={[styles.layoutIcon, { backgroundColor: withAlpha(colors.accent, 0.1) }]}>
        <Icon name={icon} size={16} color={colors.accent} />
      </View>
      <View style={styles.layoutCopy}>
        <Text numberOfLines={1} style={[typography.body, { color: colors.text }]}>
          {title}
        </Text>
        <Text numberOfLines={1} style={[typography.caption, { color: colors.muted }]}>
          {subtitle}
        </Text>
      </View>
      <PressableScale
        onPress={onUp}
        disabled={first}
        haptic={false}
        accessibilityRole="button"
        accessibilityLabel={`Move ${title} up`}
        hitSlop={6}
        style={[styles.reorder, first && styles.reorderDisabled]}
      >
        <Icon name="chevron-up" size={20} color={colors.muted} />
      </PressableScale>
      <PressableScale
        onPress={onDown}
        disabled={last}
        haptic={false}
        accessibilityRole="button"
        accessibilityLabel={`Move ${title} down`}
        hitSlop={6}
        style={[styles.reorder, last && styles.reorderDisabled]}
      >
        <Icon name="chevron-down" size={20} color={colors.muted} />
      </PressableScale>
      <Switch
        value={visible}
        onValueChange={onToggle}
        accessibilityLabel={`Show ${title} on Home`}
        trackColor={{ false: colors.surface2, true: withAlpha(colors.accent, 0.45) }}
        thumbColor={visible ? colors.accent : colors.muted}
      />
    </View>
  );
}

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
  const version = Application.nativeApplicationVersion?.trim() || '1.0.0';

  const tiles = useDashboardLayoutStore((state) => state.tiles);
  const sections = useDashboardLayoutStore((state) => state.sections);
  const toggleTile = useDashboardLayoutStore((state) => state.toggleTile);
  const moveTile = useDashboardLayoutStore((state) => state.moveTile);
  const toggleSection = useDashboardLayoutStore((state) => state.toggleSection);
  const moveSection = useDashboardLayoutStore((state) => state.moveSection);
  const resetLayout = useDashboardLayoutStore((state) => state.resetLayout);

  return (
    <Screen scroll contentStyle={styles.content}>
      <SectionHeader title="Appearance" />
      <Card contentStyle={styles.stack}>
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
        <Text style={[styles.label, styles.spaced, { color: colors.muted }]}>Accent colour</Text>
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
              label="Follow system colours"
              icon="palette"
              selected={accent === 'system'}
              onPress={() => setAccent('system')}
            />
          ) : null}
        </View>
        <Text style={[styles.note, { color: colors.muted }]}>
          {systemAccents
            ? 'Follow system colours uses the accent Android is using on this phone. Every swatch still works in light and dark mode.'
            : 'Eight palettes that work in light and dark mode. Following the system accent needs Android 12 or newer.'}
        </Text>
      </Card>

      <SectionHeader title="Units of measurement" />
      <UnitsSettings embedded />

      <SectionHeader title="Dashboard layout" />
      <Card contentStyle={styles.stack}>
        <Text style={[typography.body, { color: colors.muted }]}>
          Choose what Home shows and the order it appears in. Hidden items keep their position.
        </Text>

        <Text style={[styles.label, styles.spaced, { color: colors.muted }]}>Tiles</Text>
        {tiles.map((tile, index) => {
          const definition = getDashboardTileDefinition(tile.id);
          return (
            <LayoutRow
              key={tile.id}
              icon={definition.icon}
              title={definition.shortTitle}
              subtitle="Live overview tile"
              visible={tile.visible}
              first={index === 0}
              last={index === tiles.length - 1}
              onToggle={() => toggleTile(tile.id)}
              onUp={() => moveTile(tile.id, 'up')}
              onDown={() => moveTile(tile.id, 'down')}
            />
          );
        })}

        <Text style={[styles.label, styles.spaced, { color: colors.muted }]}>Home sliders</Text>
        {sections.map((section: DashboardSectionPreference, index) => {
          const definition = getDashboardSectionDefinition(section.id);
          if (!definition) return null;
          return (
            <LayoutRow
              key={section.id}
              icon="apps"
              title={definition.title}
              subtitle={`${definition.shortcuts.length} shortcuts`}
              visible={section.visible}
              first={index === 0}
              last={index === sections.length - 1}
              onToggle={() => toggleSection(section.id)}
              onUp={() => moveSection(section.id, 'up')}
              onDown={() => moveSection(section.id, 'down')}
            />
          );
        })}

        <Button title="Reset layout" variant="ghost" icon="refresh" onPress={resetLayout} />
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

      <Text style={[styles.version, { color: colors.muted }]}>Version {version}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  label: {
    ...typography.caption,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  spaced: {
    marginTop: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  note: {
    ...typography.caption,
    marginTop: spacing.sm,
  },
  stack: {
    gap: spacing.sm,
  },
  layoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  layoutIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  layoutCopy: {
    flex: 1,
    minWidth: 0,
    marginLeft: spacing.xs,
  },
  reorder: {
    width: 28,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reorderDisabled: {
    opacity: 0.3,
  },
  version: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
