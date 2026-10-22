import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';

import { CollapsingHeader } from '@/design-system/animations/collapsing-header';
import { AdSlot, HeaderIconButton, SectionHeader } from '@/design-system/components';
import { useFirstContentProbe, useScrollFrameProbe } from '@/dev/frame-time-probe';
import { Icon } from '@/design-system/icon';
import { useTheme } from '@/design-system/theme';
import { spacing, typography } from '@/design-system/tokens';
import { DeviceFactsRow } from '@/features/dashboard/components/device-facts-row';
import { HeroCard } from '@/features/dashboard/components/hero-card';
import { HomeSkeleton } from '@/features/dashboard/components/home-skeleton';
import { QuickTestsStrip } from '@/features/dashboard/components/quick-tests-strip';
import { SectionCarousels } from '@/features/dashboard/components/section-carousels';
import { TileGrid } from '@/features/dashboard/components/tile-grid';
import { TipsCarousel } from '@/features/dashboard/components/tips-carousel';
import { TodayUsageCard } from '@/features/dashboard/components/today-usage-card';
import { useDashboard } from '@/features/dashboard/hooks/use-dashboard';
import { useDashboardLayoutStore } from '@/state/dashboard-store';

const HEADER_REST_HEIGHT = 64;

/** Home: a live dashboard with a collapsing hero header and one scroll. */
export function HomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const { summary, inventory, cpuHistory, memoryHistory, refreshing, refresh } = useDashboard();
  const tiles = useDashboardLayoutStore((state) => state.tiles);
  const frameProbe = useScrollFrameProbe('Home scroll');
  useFirstContentProbe('Home', summary != null);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const openSettings = useCallback(() => router.push('/settings'), [router]);

  const subtitle =
    summary?.identity.status === 'ok' ? summary.identity.value.model : 'System information';

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <CollapsingHeader
        scrollY={scrollY}
        title="Device Matrix"
        subtitle={subtitle}
        topInset={insets.top}
        restHeight={HEADER_REST_HEIGHT}
        collapsedHeight={52}
        left={
          <View
            style={[
              styles.logo,
              {
                backgroundColor: `${colors.accent}18`,
                borderColor: `${colors.accent}38`,
              },
            ]}
          >
            <Icon name="gauge" size={20} color={colors.accent} />
          </View>
        }
        right={<HeaderIconButton name="settings" label="Settings" onPress={openSettings} />}
      />

      <Animated.ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + HEADER_REST_HEIGHT + spacing.sm,
            paddingBottom: spacing.xxl + insets.bottom,
          },
        ]}
        onScroll={onScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
            progressBackgroundColor={colors.surface2}
          />
        }
        {...frameProbe}
      >
        {summary == null ? (
          <View style={styles.pad}>
            <HomeSkeleton />
          </View>
        ) : (
          <>
            <View style={styles.pad}>
              <HeroCard summary={summary} scrollY={scrollY} />
            </View>

            <View>
              <View style={styles.pad}>
                <SectionHeader
                  title="Live overview"
                  action={<Text style={[styles.liveText, { color: colors.muted }]}>Every 5 s</Text>}
                />
              </View>
              <View style={styles.pad}>
                <TileGrid
                  tiles={tiles}
                  summary={summary}
                  inventory={inventory}
                  cpuHistory={cpuHistory}
                  memoryHistory={memoryHistory}
                />
              </View>
            </View>

            <QuickTestsStrip />
            <TipsCarousel />
            <TodayUsageCard />
            <View style={styles.pad}>
              <AdSlot placement="home-end" />
            </View>
            <DeviceFactsRow summary={summary} />
            <SectionCarousels />
          </>
        )}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    gap: spacing.xl,
  },
  pad: {
    paddingHorizontal: spacing.lg,
  },
  logo: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveText: {
    ...typography.caption,
    fontFamily: 'Inter_500Medium',
  },
});
