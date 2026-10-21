import { useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';

import {
  Card,
  Chip,
  CopyableText,
  EmptyState,
  InfoSheet,
  PermissionBanner,
  Screen,
  SectionHeader,
  Skeleton,
} from '@/design-system/components';
import { useTheme } from '@/design-system/theme';
import { spacing, typography } from '@/design-system/tokens';
import { formatUptime } from '@/core/utils/format-duration';
import { HorizontalBars, VerticalBars } from '@/features/apps/components/analyzer-charts';
import { useScreenTime } from '@/features/apps/hooks/use-screen-time';
import { formatLastUsed, SCREEN_TIME_RANGES } from '@/features/apps/services/apps-service';
import type { AppChartBar } from '@/features/apps/types';

const SCREEN_TIME_SHEET = {
  title: 'Screen time: what this means',
  paragraphs: [
    'Foreground time comes from Android’s UsageStatsManager after you allow Usage Access (Settings › Special app access › Usage access). The app reads it on this phone and never uploads it.',
    'Totals cover calendar days in the phone’s own time zone. “Today” starts at local midnight; “7 days” covers today and the six days before it. Android may keep less history than that, in which case the chart shows what it still has.',
    'The daily chart is built from the same per-day readings as the ranking. Last used is Android’s lastTimeUsed value for each app; “Not reported” means Android returned zero.',
    'Apps without a launcher icon may appear in the ranking when Android reports usage for them; their icon and label are not available to this app, so the package name is shown instead.',
  ],
};

/** Screen time behind Usage Access: total, daily chart, ranked apps and last-used times. */
export function ScreenTimeScreen() {
  const { colors } = useTheme();
  const {
    granted,
    notice,
    openSettings,
    range,
    setRange,
    reading,
    ranking,
    bars,
    refresh,
    refreshing,
  } = useScreenTime();
  const [sheetVisible, setSheetVisible] = useState(false);

  const rangeLabel = SCREEN_TIME_RANGES.find((entry) => entry.id === range)?.label ?? '';
  const data = reading?.status === 'ok' ? reading.value : null;

  const rankingBars = useMemo<AppChartBar[]>(
    () =>
      ranking.rows.map((row) => ({
        key: row.packageName,
        label: row.label,
        count: row.totalTimeMs,
        share: row.share,
        icon: row.icon,
        caption: `Last used ${formatLastUsed(row.lastUsedMs) ?? 'Not reported'}`,
      })),
    [ranking.rows],
  );

  const totalCopy = data == null ? undefined : formatUptime(data.totalTimeMs);
  const dailyCopy =
    bars.length > 0
      ? bars.map((bar) => `${bar.label}: ${formatUptime(bar.totalTimeMs)}`).join('\n')
      : undefined;
  const topAppsCopy =
    ranking.rows.length > 0
      ? ranking.rows
          .map(
            (row) =>
              `${row.label}: ${formatUptime(row.totalTimeMs)} · last used ${
                formatLastUsed(row.lastUsedMs) ?? 'Not reported'
              }`,
          )
          .join('\n')
      : undefined;

  return (
    <Screen
      scroll
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
      {granted === null ? (
        <ScreenTimeSkeleton />
      ) : granted === false ? (
        <>
          <PermissionBanner
            icon="clock"
            title="Usage Access is off"
            message="Android keeps screen time and last-used times private until you allow Usage Access. The button opens the exact system screen; nothing is read while it is off."
            actionLabel="Open settings"
            onAction={openSettings}
          />
          <Text style={[styles.steps, { color: colors.muted }]}>
            Settings › Special app access › Usage access › Device Matrix
          </Text>
          {notice ? <Text style={[styles.steps, { color: colors.muted }]}>{notice}</Text> : null}
        </>
      ) : (
        <>
          <SectionHeader
            title="Screen time"
            copyText={totalCopy}
            onInfo={() => setSheetVisible(true)}
          />
          <View style={styles.chips}>
            {SCREEN_TIME_RANGES.map((entry) => (
              <Chip
                key={entry.id}
                label={entry.label}
                selected={range === entry.id}
                onPress={() => setRange(entry.id)}
              />
            ))}
          </View>

          {reading === null ? (
            <ScreenTimeSkeleton />
          ) : reading.status !== 'ok' ? (
            <Card>
              <Text style={[styles.text, { color: colors.muted }]}>
                {reading.status === 'unavailable' ? reading.reason : 'Permission needed.'}
              </Text>
            </Card>
          ) : data == null ? null : (
            <>
              <Card>
                <View style={styles.cardBody}>
                  <CopyableText
                    value={formatUptime(data.totalTimeMs)}
                    copyLabel="Screen time"
                    style={[styles.total, { color: colors.text }]}
                  >
                    {formatUptime(data.totalTimeMs)}
                  </CopyableText>
                  <Text style={[styles.caption, { color: colors.muted }]}>
                    Foreground time · {rangeLabel}
                    {refreshing ? ' · updating…' : ''}
                  </Text>
                </View>
              </Card>

              <SectionHeader title="Daily chart" copyText={dailyCopy} />
              <Card>
                <View style={styles.cardBody}>
                  {bars.length === 0 ? (
                    <Text style={[styles.caption, { color: colors.muted }]}>
                      Android did not return any daily totals for this range.
                    </Text>
                  ) : (
                    <VerticalBars
                      bars={bars}
                      formatValue={(bar) => formatUptime(bar.totalTimeMs)}
                    />
                  )}
                  <Text style={[styles.caption, { color: colors.muted }]}>
                    Per calendar day in the phone’s time zone. Values are foreground time, not
                    screen-on time.
                  </Text>
                </View>
              </Card>

              <SectionHeader title="Top apps" copyText={topAppsCopy} />
              <Card>
                <View style={styles.cardBody}>
                  {ranking.rows.length === 0 ? (
                    <EmptyState
                      icon="clock"
                      title="No app usage recorded"
                      message="Android has not recorded foreground time for these apps in this range yet."
                    />
                  ) : (
                    <>
                      <HorizontalBars
                        bars={rankingBars}
                        formatValue={(bar) => formatUptime(bar.count)}
                      />
                      {ranking.moreApps > 0 ? (
                        <CopyableText
                          value={`${ranking.moreApps} more apps · ${formatUptime(ranking.moreTimeMs)}`}
                          copyLabel="More apps"
                          style={[styles.caption, { color: colors.muted }]}
                        >
                          {ranking.moreApps} more apps · {formatUptime(ranking.moreTimeMs)}
                        </CopyableText>
                      ) : null}
                    </>
                  )}
                  <Text style={[styles.caption, { color: colors.muted }]}>
                    Ranked by foreground time. Last-used times are Android’s own readings.
                  </Text>
                </View>
              </Card>
            </>
          )}
        </>
      )}

      {notice && granted === true ? (
        <Text style={[styles.caption, { color: colors.muted }]}>{notice}</Text>
      ) : null}

      <InfoSheet
        visible={sheetVisible}
        title={SCREEN_TIME_SHEET.title}
        paragraphs={SCREEN_TIME_SHEET.paragraphs}
        onClose={() => setSheetVisible(false)}
      />
    </Screen>
  );
}

function ScreenTimeSkeleton() {
  return (
    <View style={styles.content}>
      <Skeleton width="40%" height={14} />
      <Card>
        <View style={styles.cardBody}>
          <Skeleton width="45%" height={28} />
          <Skeleton width="70%" height={16} />
        </View>
      </Card>
      <Card>
        <View style={styles.cardBody}>
          <Skeleton height={120} />
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  cardBody: {
    gap: spacing.sm,
  },
  total: {
    ...typography.display,
  },
  caption: {
    ...typography.caption,
  },
  text: {
    ...typography.body,
  },
  steps: {
    ...typography.caption,
    textAlign: 'center',
  },
});
