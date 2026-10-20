import { Link, Redirect } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

import { AuroraBackground } from '@/design-system/animations/aurora-background';
import { CollapsingHeader } from '@/design-system/animations/collapsing-header';
import { HeatShimmer } from '@/design-system/animations/heat-shimmer';
import { LivePulse } from '@/design-system/animations/live-pulse';
import { useCountUp } from '@/design-system/animations/use-count-up';
import { PressableScale } from '@/design-system/animations/pressable-scale';
import { Shimmer } from '@/design-system/animations/shimmer';
import { StaggerItem } from '@/design-system/animations/stagger';
import { TabPill } from '@/design-system/animations/tab-pill';
import { TileTransition } from '@/design-system/animations/tile-transition';
import type { MotionMode } from '@/design-system/animations/motion';
import {
  AdSlot,
  AppBar,
  Button,
  Card,
  Chip,
  EmptyState,
  PermissionBanner,
  Screen,
  SectionHeader,
  Skeleton,
  StatRow,
  TipCard,
} from '@/design-system/components';
import { Icon } from '@/design-system/icon';
import { statusColor } from '@/design-system/status';
import { useTheme, type ThemeMode } from '@/design-system/theme';
import { accents, spacing, typography, type AccentName } from '@/design-system/tokens';
import {
  BatteryGauge,
  CoreBars,
  LiveGraph,
  MemoryDonut,
  Ring,
  StorageBar,
  ThermalGauge,
  type CoreBar,
} from '@/design-system/visuals';
import { useSettingsStore } from '@/state/settings-store';
import { NativeProbe } from '@/dev/native-probe';

import { DevSlider } from '@/dev/dev-slider';

const themeModes: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
];

const accentNames: AccentName[] = ['cyan', 'blue', 'violet', 'green'];

const initialCores: CoreBar[] = Array.from({ length: 8 }, (_, index) => ({
  label: `C${index}`,
  value: 30 + index * 4,
}));

const animationModes: { value: MotionMode; label: string }[] = [
  { value: 'full', label: 'Full' },
  { value: 'reduced', label: 'Reduced' },
  { value: 'off', label: 'Off' },
];

/** Dev-only gallery: every component and visual in the current theme, with live controls. */
export default function DevGalleryScreen() {
  const { colors, scheme } = useTheme();
  const themeMode = useSettingsStore((state) => state.themeMode);
  const accent = useSettingsStore((state) => state.accent);
  const setThemeMode = useSettingsStore((state) => state.setThemeMode);
  const setAccent = useSettingsStore((state) => state.setAccent);

  const [ring, setRing] = useState(62);
  const [battery, setBattery] = useState(48);
  const [charging, setCharging] = useState(false);
  const [memory, setMemory] = useState(58);
  const [thermal, setThermal] = useState(41);
  const [storage, setStorage] = useState({ apps: 42, media: 18, other: 6 });
  const [coreLoad, setCoreLoad] = useState(0.55);
  const [cores, setCores] = useState<CoreBar[]>(initialCores);
  const [live, setLive] = useState<number[]>([]);
  const [paused, setPaused] = useState(false);
  const [tipVisible, setTipVisible] = useState(true);
  const [staggerKey, setStaggerKey] = useState(0);
  const [tileKey, setTileKey] = useState(0);
  const [countValue, setCountValue] = useState(72);
  const [tabIndex, setTabIndex] = useState(1);
  const [heatActive, setHeatActive] = useState(true);
  const [collapsingValue, setCollapsingValue] = useState(0);
  const collapsingY = useSharedValue(0);
  const animationMode = useSettingsStore((state) => state.animationMode);
  const setAnimationMode = useSettingsStore((state) => state.setAnimationMode);
  const countUp = useCountUp(countValue, { decimals: 0 });
  const tick = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      const base = 15 + coreLoad * 85;
      setCores(
        initialCores.map((core, index) => ({
          ...core,
          value: Math.max(4, Math.min(100, base + Math.sin(Date.now() / 650 + index * 1.7) * 26)),
        })),
      );
    }, 900);
    return () => clearInterval(id);
  }, [coreLoad]);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      tick.current += 1;
      const t = tick.current;
      setLive((prev) => {
        const next = [...prev, 50 + Math.sin(t / 5) * 22 + Math.sin(t / 1.7) * 6];
        return next.length > 48 ? next.slice(next.length - 48) : next;
      });
    }, 450);
    return () => clearInterval(id);
  }, [paused]);

  if (!__DEV__) {
    return <Redirect href="/" />;
  }

  return (
    <Screen scroll contentStyle={styles.content}>
      <Link href="/dev/support-matrix" style={[styles.link, { color: colors.accent }]}>
        Open support matrix
      </Link>
      <SectionHeader title="Theme" />
      <Card>
        <Text style={[styles.sub, { color: colors.muted }]}>Mode · resolved {scheme}</Text>
        <View style={styles.wrap}>
          {themeModes.map((mode) => (
            <Chip
              key={mode.value}
              label={mode.label}
              selected={themeMode === mode.value}
              onPress={() => setThemeMode(mode.value)}
            />
          ))}
        </View>
        <Text style={[styles.sub, styles.spaced, { color: colors.muted }]}>Accent</Text>
        <View style={styles.wrap}>
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

      <SectionHeader title="Palette" />
      <Card>
        <View style={styles.wrap}>
          {Object.entries(colors).map(([name, hex]) => (
            <View key={name} style={styles.swatch}>
              <View
                style={[styles.swatchChip, { backgroundColor: hex, borderColor: colors.border }]}
              />
              <Text numberOfLines={1} style={[typography.caption, { color: colors.muted }]}>
                {name}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      <SectionHeader title="Type" />
      <Card>
        <Text style={[typography.display, { color: colors.text }]}>Display 34</Text>
        <Text style={[typography.title, { color: colors.text }]}>Title 20</Text>
        <Text style={[typography.body, { color: colors.text }]}>
          Body 14 — rows and paragraphs.
        </Text>
        <Text style={[typography.caption, { color: colors.muted }]}>
          Caption 12 — supporting text.
        </Text>
        <Text style={[typography.mono, { color: colors.text }]}>JetBrains Mono 13 — 0O 1lI 2Z</Text>
      </Card>

      <SectionHeader title="Buttons & chips" />
      <Card>
        <View style={styles.wrap}>
          <Button title="Primary" icon="zap" onPress={() => {}} />
          <Button title="Secondary" variant="secondary" onPress={() => {}} />
          <Button title="Ghost" variant="ghost" onPress={() => {}} />
          <Button title="Disabled" disabled onPress={() => {}} />
        </View>
        <View style={[styles.wrap, styles.spaced]}>
          <Chip label="Selected" selected />
          <Chip label="Unselected" />
          <Chip label="With icon" icon="tips" />
          <Chip label="Legend" dotColor={colors.good} />
        </View>
      </Card>

      <SectionHeader title="Cards & rows" />
      <Card>
        <StatRow label="Device" value="Pixel 9 Pro" />
        <StatRow label="Android" value="16 (API 36)" />
        <StatRow label="Build ID" value="BP2A.250605.031" />
      </Card>
      <Card onPress={() => {}}>
        <Text style={[typography.body, { color: colors.text }]}>
          Pressable glass card — press for scale + haptic. Stat rows copy on long-press.
        </Text>
      </Card>
      <Card>
        <AppBar
          title="AppBar"
          subtitle="In-screen header"
          right={<Icon name="settings" size={20} color={colors.muted} />}
        />
        <Text style={[typography.caption, styles.spaced, { color: colors.muted }]}>
          Content under the app bar.
        </Text>
      </Card>

      <SectionHeader title="Feedback" />
      <Card style={styles.stack}>
        <Skeleton height={16} />
        <Skeleton width="62%" height={16} />
        <Skeleton width={120} height={40} round />
      </Card>
      <PermissionBanner
        title="Wi-Fi name needs location"
        message="Android hides the network name unless location access is granted."
        actionLabel="Open settings"
        onAction={() => {}}
      />
      {tipVisible ? (
        <TipCard
          title="Tip"
          body="Long-press a stat row to copy its value."
          onDismiss={() => setTipVisible(false)}
        />
      ) : null}
      <AdSlot placement="gallery" />
      <Card>
        <EmptyState
          icon="sensors"
          title="Not available on this device"
          message="This sensor is not exposed by the OEM on this model."
          action={<Button title="Replay" variant="ghost" onPress={() => {}} />}
        />
      </Card>

      <SectionHeader title="Ring" />
      <Card>
        <View style={styles.center}>
          <Ring value={ring} label="CPU load" />
        </View>
        <DevSlider label="Ring value" value={ring} min={0} max={100} onChange={setRing} />
      </Card>

      <SectionHeader title="Battery" />
      <Card>
        <View style={styles.center}>
          <BatteryGauge value={battery} charging={charging} />
        </View>
        <DevSlider
          label="Battery level"
          value={battery}
          min={0}
          max={100}
          onChange={setBattery}
          format={(value) => `${Math.round(value)}%`}
        />
        <View style={[styles.wrap, styles.spaced]}>
          <Chip
            label="Charging"
            icon="zap"
            selected={charging}
            onPress={() => setCharging((current) => !current)}
          />
        </View>
      </Card>

      <SectionHeader title="Storage" />
      <Card>
        <StorageBar
          segments={[
            {
              key: 'apps',
              label: 'Apps',
              value: storage.apps,
              color: colors.primary,
              valueLabel: `${storage.apps} GB`,
            },
            {
              key: 'media',
              label: 'Media',
              value: storage.media,
              color: colors.accent,
              valueLabel: `${storage.media} GB`,
            },
            {
              key: 'other',
              label: 'Other',
              value: storage.other,
              color: colors.violet,
              valueLabel: `${storage.other} GB`,
            },
          ]}
          total={160}
        />
        <DevSlider
          label="Apps"
          value={storage.apps}
          min={0}
          max={120}
          onChange={(value) => setStorage((prev) => ({ ...prev, apps: value }))}
          format={(value) => `${Math.round(value)} GB`}
        />
        <DevSlider
          label="Media"
          value={storage.media}
          min={0}
          max={120}
          onChange={(value) => setStorage((prev) => ({ ...prev, media: value }))}
          format={(value) => `${Math.round(value)} GB`}
        />
        <DevSlider
          label="Other"
          value={storage.other}
          min={0}
          max={60}
          onChange={(value) => setStorage((prev) => ({ ...prev, other: value }))}
          format={(value) => `${Math.round(value)} GB`}
        />
      </Card>

      <SectionHeader title="Memory" />
      <Card>
        <View style={styles.center}>
          <MemoryDonut value={memory} label="Memory used" />
        </View>
        <DevSlider
          label="Memory"
          value={memory}
          min={0}
          max={100}
          onChange={setMemory}
          format={(value) => `${Math.round(value)}%`}
        />
      </Card>

      <SectionHeader title="CPU cores" />
      <Card>
        <CoreBars bars={cores} />
        <DevSlider
          label="Base load"
          value={coreLoad}
          min={0}
          max={1}
          step={0.05}
          onChange={setCoreLoad}
          format={(value) => `${Math.round(value * 100)}%`}
        />
      </Card>

      <SectionHeader title="Thermal" />
      <Card>
        <View style={styles.center}>
          <ThermalGauge value={thermal} />
        </View>
        <DevSlider
          label="Temperature"
          value={thermal}
          min={30}
          max={90}
          onChange={setThermal}
          format={(value) => `${Math.round(value)}°C`}
        />
      </Card>

      <SectionHeader title="Live graph" />
      <Card>
        <LiveGraph data={live} min={0} max={100} paused={paused} />
        <View style={[styles.wrap, styles.spaced]}>
          <Chip
            label={paused ? 'Resume' : 'Pause'}
            selected={paused}
            onPress={() => setPaused((current) => !current)}
          />
        </View>
      </Card>

      <SectionHeader title="Status colours" />
      <Card>
        <View style={styles.wrap}>
          {[0.2, 0.5, 0.75, 0.95].map((ratio) => (
            <Chip
              key={ratio}
              label={`${Math.round(ratio * 100)}%`}
              dotColor={statusColor(ratio, colors)}
            />
          ))}
        </View>
      </Card>

      <SectionHeader title="Motion" />
      <View key={`stagger-${staggerKey}`} style={styles.stack}>
        {[0, 1, 2, 3].map((index) => (
          <StaggerItem key={index} index={index}>
            <Card>
              <Text style={[typography.body, { color: colors.text }]}>
                Stagger item {index + 1}
              </Text>
            </Card>
          </StaggerItem>
        ))}
      </View>
      <Button
        title="Replay stagger"
        variant="secondary"
        onPress={() => setStaggerKey((key) => key + 1)}
      />

      <SectionHeader title="Animation system" />
      <Card contentStyle={styles.stack}>
        <Text style={[styles.sub, { color: colors.muted }]}>Mode</Text>
        <View style={styles.wrap}>
          {animationModes.map((mode) => (
            <Chip
              key={mode.value}
              label={mode.label}
              selected={animationMode === mode.value}
              onPress={() => setAnimationMode(mode.value)}
            />
          ))}
        </View>
        <PressableScale
          onPress={() => {}}
          accessibilityRole="button"
          accessibilityLabel="Press for scale"
          style={[
            styles.pressDemo,
            { borderColor: colors.border, backgroundColor: colors.surface2 },
          ]}
        >
          <Text style={[typography.body, { color: colors.text }]}>Press for scale + haptic</Text>
        </PressableScale>
        <View style={styles.rowSpread}>
          <Text style={[typography.body, { color: colors.muted }]}>Count-up</Text>
          <Text style={[typography.display, { color: colors.text }]}>{countUp}</Text>
        </View>
        <DevSlider
          label="Count target"
          value={countValue}
          min={0}
          max={100}
          onChange={setCountValue}
          format={(value) => `${Math.round(value)}`}
        />
      </Card>

      <Card contentStyle={styles.stack}>
        <Text style={[styles.sub, { color: colors.muted }]}>Shimmer skeleton</Text>
        <Shimmer height={18} />
        <Shimmer width="58%" height={18} />
      </Card>

      <Card contentStyle={styles.stack}>
        <View style={styles.rowSpread}>
          <View style={styles.pulseRow}>
            <LivePulse active color={colors.good} />
            <Text style={[typography.body, { color: colors.text }]}>Live pulse</Text>
          </View>
          <View style={styles.shimmerWrap}>
            <HeatShimmer width={120} height={28} color={colors.warning} active={heatActive} />
          </View>
        </View>
        <Chip
          label="Heat shimmer"
          selected={heatActive}
          onPress={() => setHeatActive((current) => !current)}
        />
      </Card>

      <Card style={styles.auroraCard} contentStyle={styles.auroraBody}>
        <AuroraBackground intensity={1} />
        <Text style={[typography.title, { color: colors.text }]}>Aurora background</Text>
        <Text style={[typography.caption, { color: colors.muted }]}>
          Skia shader, paused off-screen and under Reduced/Off.
        </Text>
      </Card>

      <Card style={styles.headerCard} contentStyle={styles.headerCardBody}>
        <CollapsingHeader
          scrollY={collapsingY}
          title="Collapsing header"
          subtitle="Fades and shrinks while you scroll"
          restHeight={96}
          collapsedHeight={52}
        />
        <View style={styles.headerSpacer} />
      </Card>
      <DevSlider
        label="Scroll offset"
        value={collapsingValue}
        min={0}
        max={120}
        onChange={(value) => {
          setCollapsingValue(value);
          collapsingY.set(value);
        }}
        format={(value) => `${Math.round(value)} dp`}
      />

      <Card style={styles.tabCard} contentStyle={styles.tabCardBody}>
        <View style={styles.tabTrack}>
          <TabPill
            index={tabIndex}
            count={3}
            itemWidth={96}
            height={40}
            top={0}
            horizontalInset={10}
          />
          {[0, 1, 2].map((index) => (
            <PressableScale
              key={index}
              onPress={() => setTabIndex(index)}
              accessibilityRole="button"
              accessibilityLabel={`Tab ${index + 1}`}
              style={styles.tabItem}
            >
              <Text style={[typography.caption, { color: colors.text }]}>Tab {index + 1}</Text>
            </PressableScale>
          ))}
        </View>
      </Card>

      <View key={`tile-${tileKey}`} style={styles.stack}>
        {[0, 1, 2].map((index) => (
          <TileTransition key={index} index={index}>
            <Card>
              <Text style={[typography.body, { color: colors.text }]}>
                Layout transition tile {index + 1}
              </Text>
            </Card>
          </TileTransition>
        ))}
      </View>
      <Button
        title="Replay tile transition"
        variant="secondary"
        onPress={() => setTileKey((key) => key + 1)}
      />

      <NativeProbe />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  sub: {
    ...typography.caption,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  link: {
    ...typography.body,
    textDecorationLine: 'underline',
  },
  spaced: {
    marginTop: spacing.md,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  stack: {
    gap: spacing.md,
  },
  center: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  swatch: {
    width: 72,
    gap: spacing.xs,
  },
  swatchChip: {
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
  },
  pressDemo: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  rowSpread: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  pulseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  shimmerWrap: {
    width: 120,
    height: 28,
  },
  auroraCard: {
    height: 140,
  },
  auroraBody: {
    height: 108,
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  headerCard: {
    height: 140,
  },
  headerCardBody: {
    padding: 0,
  },
  headerSpacer: {
    flex: 1,
  },
  tabCard: {
    height: 80,
  },
  tabCardBody: {
    padding: 0,
    alignItems: 'center',
  },
  tabTrack: {
    width: 288,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabItem: {
    width: 96,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
