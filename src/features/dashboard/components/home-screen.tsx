import { useRouter } from 'expo-router';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';

import { StaggerItem } from '@/design-system/animations/stagger';
import { withAlpha } from '@/design-system/color';
import {
  AdSlot,
  AppBar,
  HeaderIconButton,
  Screen,
  SectionHeader,
  TipCard,
} from '@/design-system/components';
import { useTheme } from '@/design-system/theme';
import { spacing, typography } from '@/design-system/tokens';
import { DeviceSummaryCard } from '@/features/dashboard/components/device-summary-card';
import { HomeSkeleton } from '@/features/dashboard/components/home-skeleton';
import { OverviewRings } from '@/features/dashboard/components/overview-rings';
import { QuickActions } from '@/features/dashboard/components/quick-actions';
import { useDashboard } from '@/features/dashboard/hooks/use-dashboard';

/** Home dashboard: device identity, live rings, a tip and system shortcuts. */
export function HomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { summary, refreshing, refresh, notice, openSettings } = useDashboard();

  return (
    <Screen
      edgeTop
      scroll
      header={
        <AppBar
          title="Device Matrix"
          subtitle="System info"
          left={<LogoMark />}
          right={
            <HeaderIconButton
              name="settings"
              label="Settings"
              onPress={() => router.push('/settings')}
            />
          }
        />
      }
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
          colors={[colors.accent]}
          progressBackgroundColor={colors.surface2}
          tintColor={colors.accent}
        />
      }
      contentStyle={styles.content}
    >
      <StaggerItem index={0}>
        {summary ? (
          <View style={styles.stack}>
            <DeviceSummaryCard identity={summary.identity} uptime={summary.uptime} />
            <OverviewRings
              memory={summary.memory}
              storage={summary.storage}
              battery={summary.battery}
              onOpenMemory={() => router.push('/memory')}
              onOpenStorage={() => router.push('/storage')}
              onOpenBattery={() => router.push('/battery')}
            />
          </View>
        ) : (
          <HomeSkeleton />
        )}
      </StaggerItem>

      <StaggerItem index={1}>
        <TipCard
          title="Tip"
          body="Device care tips are on their way — they arrive in a later update."
        />
      </StaggerItem>

      <StaggerItem index={2}>
        <AdSlot />
      </StaggerItem>

      <StaggerItem index={3}>
        <View style={styles.actions}>
          <SectionHeader title="Quick actions" />
          <QuickActions onAction={openSettings} />
          {notice ? <Text style={[styles.notice, { color: colors.muted }]}>{notice}</Text> : null}
        </View>
      </StaggerItem>
    </Screen>
  );
}

/** The in-app monogram mark — same accent styling as the launcher icon. */
function LogoMark() {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.logo,
        {
          borderColor: withAlpha(colors.accent, 0.4),
          backgroundColor: withAlpha(colors.accent, 0.12),
        },
      ]}
    >
      <Text style={[styles.logoText, { color: colors.accent }]}>DM</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  stack: {
    gap: spacing.lg,
  },
  actions: {
    gap: spacing.sm,
  },
  notice: {
    ...typography.caption,
    textAlign: 'center',
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    ...typography.caption,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
  },
});
