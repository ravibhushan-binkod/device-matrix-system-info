import { useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';

import {
  Button,
  Card,
  Chip,
  CopyableText,
  EmptyState,
  InfoSheet,
  Screen,
  SectionHeader,
  Skeleton,
} from '@/design-system/components';
import { useTheme } from '@/design-system/theme';
import { spacing, typography } from '@/design-system/tokens';
import { LiveGraph } from '@/design-system/visuals';
import { useDataUsage } from '@/features/network/hooks/use-data-usage';
import {
  appUsageSplit,
  formatUsageBytes,
  rangeEdgeLabels,
  seriesPoints,
  seriesTotalBytes,
  topAppsRanking,
  USAGE_RANGES,
  usageWindow,
  type DataUsageRange,
} from '@/features/network/services/data-usage-service';

type UsageType = 'wifi' | 'mobile';

const USAGE_SHEET = {
  title: 'Data usage: what this means',
  paragraphs: [
    'These totals come from Android’s own traffic counters (NetworkStatsManager) and cover only what this phone measured. Android decides how far back it keeps counters, so an older range can come back empty.',
    'Usage Access is a special Android permission (Settings › Special app access › Usage access). Without it, Android hides every traffic counter from apps — the button on this screen opens the right system page.',
    'Android withholds mobile-data figures from apps that do not request the phone-state permission. This app never asks for it, so mobile rows appear only when Android reports them — otherwise Wi-Fi alone is shown, with a note.',
    'Nothing here is uploaded: the figures are read and drawn on this device.',
  ],
};

/** Data usage: Wi-Fi/mobile traffic behind Usage Access, with a top-apps list. */
export function DataUsageScreen() {
  const { colors } = useTheme();
  const { usageAccess, range, setRange, usage, topApps, loading, refresh, notice, openSettings } =
    useDataUsage();

  const [type, setType] = useState<UsageType>('wifi');
  const [sheetVisible, setSheetVisible] = useState(false);

  const usageValue = usage?.status === 'ok' ? usage.value : null;
  const mobileAvailable = usageValue?.mobile != null;
  const activeType: UsageType = type === 'mobile' && !mobileAvailable ? 'wifi' : type;
  const series = activeType === 'wifi' ? (usageValue?.wifi ?? null) : (usageValue?.mobile ?? null);

  const points = useMemo(() => seriesPoints(series), [series]);
  const totalBytes = seriesTotalBytes(series);
  const edges = useMemo(
    () => rangeEdgeLabels(range, usageWindow(range, new Date()), new Date()),
    [range],
  );

  const ranking = useMemo(
    () => topAppsRanking(topApps?.status === 'ok' ? topApps.value.apps : []),
    [topApps],
  );
  const mobileBlocked =
    (usageValue?.mobileBlocked ?? false) ||
    (topApps?.status === 'ok' && topApps.value.mobileBlocked);

  const rangeLabel = USAGE_RANGES.find((option) => option.id === range)?.label ?? '';
  const totalLabel = `${formatUsageBytes(totalBytes)} · ${
    activeType === 'wifi' ? 'Wi-Fi' : 'Mobile'
  } · ${rangeLabel}`;
  const topAppsCopy =
    ranking.rows.length > 0
      ? [
          ...ranking.rows.map(
            (row) =>
              `${row.label}: ${formatUsageBytes(row.totalBytes)} (${appUsageSplit(
                row,
                mobileBlocked,
              )})`,
          ),
          ranking.moreApps > 0
            ? `${ranking.moreApps} more apps · ${formatUsageBytes(ranking.moreBytes)}`
            : null,
        ]
          .filter((line): line is string => line != null)
          .join('\n')
      : undefined;

  return (
    <Screen
      scroll
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={() => void refresh()}
          colors={[colors.accent]}
          progressBackgroundColor={colors.surface2}
          tintColor={colors.accent}
        />
      }
      contentStyle={styles.content}
    >
      {usageAccess === null ? (
        <DataUsageSkeleton />
      ) : !usageAccess ? (
        <>
          <EmptyState
            icon="gauge"
            title="Usage Access needed"
            message="Android keeps network statistics behind the Usage Access permission. The figures are read on this phone and never sent anywhere."
            action={
              <Button title="Open Usage Access settings" icon="settings" onPress={openSettings} />
            }
          />
          <Text style={[styles.steps, { color: colors.muted }]}>
            Settings › Special app access › Usage access › Device Matrix
          </Text>
          {notice ? <Text style={[styles.steps, { color: colors.muted }]}>{notice}</Text> : null}
        </>
      ) : (
        <>
          <SectionHeader
            title="Data usage"
            copyText={usageValue == null ? undefined : totalLabel}
            onInfo={() => setSheetVisible(true)}
          />
          <View style={styles.chips}>
            {USAGE_RANGES.map((option) => (
              <Chip
                key={option.id}
                label={option.label}
                selected={range === option.id}
                onPress={() => setRange(option.id as DataUsageRange)}
              />
            ))}
          </View>

          <Card>
            <View style={styles.cardBody}>
              <View style={styles.chips}>
                <Chip
                  label="Wi-Fi"
                  selected={activeType === 'wifi'}
                  onPress={() => setType('wifi')}
                />
                {mobileAvailable ? (
                  <Chip
                    label="Mobile"
                    selected={activeType === 'mobile'}
                    onPress={() => setType('mobile')}
                  />
                ) : null}
              </View>

              {usage === null ? (
                <View style={styles.graphSkeleton}>
                  <Skeleton width="50%" height={26} />
                  <Skeleton height={120} />
                </View>
              ) : usage.status !== 'ok' ? (
                <Text style={[styles.text, { color: colors.muted }]}>
                  {usage.status === 'denied'
                    ? 'Usage Access is needed for these figures.'
                    : usage.reason}
                </Text>
              ) : (
                <>
                  <View style={styles.totalRow}>
                    <CopyableText
                      value={formatUsageBytes(totalBytes)}
                      copyLabel="Data usage"
                      style={[styles.total, { color: colors.text }]}
                    >
                      {formatUsageBytes(totalBytes)}
                    </CopyableText>
                    <Text style={[styles.caption, { color: colors.muted }]}>
                      {activeType === 'wifi' ? 'Wi-Fi' : 'Mobile'} · {rangeLabel}
                      {loading ? ' · updating…' : ''}
                    </Text>
                  </View>
                  {series === null ? (
                    <Text style={[styles.text, { color: colors.muted }]}>
                      Android did not return {activeType === 'wifi' ? 'Wi-Fi' : 'mobile'} data for
                      this range.
                    </Text>
                  ) : points.length === 0 ? (
                    <Text style={[styles.text, { color: colors.muted }]}>
                      No traffic recorded in this range.
                    </Text>
                  ) : (
                    <>
                      <LiveGraph
                        data={points}
                        height={130}
                        color={activeType === 'wifi' ? colors.accent : colors.violet}
                        accessibilityLabel={`${activeType} usage ${rangeLabel}`}
                      />
                      <View style={styles.edgeRow}>
                        <Text style={[styles.caption, { color: colors.muted }]}>{edges.start}</Text>
                        <Text style={[styles.caption, { color: colors.muted }]}>{edges.end}</Text>
                      </View>
                    </>
                  )}
                  {!mobileAvailable ? (
                    <Text style={[styles.caption, { color: colors.muted }]}>
                      {mobileBlocked
                        ? 'Android did not return mobile data: it withholds mobile figures from apps without the phone-call permission, which this app never requests.'
                        : 'Android reported no mobile data for this device or range.'}
                    </Text>
                  ) : null}
                </>
              )}
            </View>
          </Card>

          <SectionHeader
            title="Top apps"
            copyText={topAppsCopy}
            onInfo={() => setSheetVisible(true)}
          />
          <Card>
            <View style={styles.cardBody}>
              {topApps === null ? (
                <View style={styles.appSkeleton}>
                  {[0, 1, 2].map((row) => (
                    <Skeleton key={row} height={36} />
                  ))}
                </View>
              ) : topApps.status !== 'ok' ? (
                <Text style={[styles.text, { color: colors.muted }]}>
                  {topApps.status === 'denied'
                    ? 'Usage Access is needed for the app list.'
                    : topApps.reason}
                </Text>
              ) : ranking.rows.length === 0 ? (
                <Text style={[styles.text, { color: colors.muted }]}>
                  No app traffic recorded in this range.
                </Text>
              ) : (
                <>
                  {ranking.rows.map((row, index) => (
                    <View
                      key={row.key}
                      style={[
                        styles.appRow,
                        index > 0
                          ? {
                              borderTopWidth: StyleSheet.hairlineWidth,
                              borderTopColor: colors.border,
                            }
                          : null,
                      ]}
                    >
                      <View style={styles.appHead}>
                        <CopyableText
                          value={row.label}
                          copyLabel="App"
                          numberOfLines={1}
                          style={[styles.appName, { color: colors.text }]}
                        >
                          {row.label}
                        </CopyableText>
                        <CopyableText
                          value={formatUsageBytes(row.totalBytes)}
                          copyLabel={row.label}
                          style={[styles.appValue, { color: colors.text }]}
                        >
                          {formatUsageBytes(row.totalBytes)}
                        </CopyableText>
                      </View>
                      <View style={[styles.barTrack, { backgroundColor: colors.surface2 }]}>
                        <View
                          style={[
                            styles.barFill,
                            {
                              width: `${Math.max(4, Math.round(row.share * 100))}%`,
                              backgroundColor: colors.accent,
                            },
                          ]}
                        />
                      </View>
                      <CopyableText
                        value={appUsageSplit(row, mobileBlocked)}
                        copyLabel="Usage split"
                        style={[styles.caption, { color: colors.muted }]}
                      >
                        {appUsageSplit(row, mobileBlocked)}
                      </CopyableText>
                    </View>
                  ))}
                  {ranking.moreApps > 0 ? (
                    <CopyableText
                      value={`${ranking.moreApps} more apps · ${formatUsageBytes(ranking.moreBytes)}`}
                      copyLabel="More apps"
                      style={[styles.caption, { color: colors.muted }]}
                    >
                      {ranking.moreApps} more apps · {formatUsageBytes(ranking.moreBytes)}
                    </CopyableText>
                  ) : null}
                </>
              )}
            </View>
          </Card>
        </>
      )}

      <InfoSheet
        visible={sheetVisible}
        title={USAGE_SHEET.title}
        paragraphs={USAGE_SHEET.paragraphs}
        onClose={() => setSheetVisible(false)}
      />
    </Screen>
  );
}

function DataUsageSkeleton() {
  return (
    <View style={styles.content}>
      <Skeleton width="40%" height={14} />
      <Card>
        <View style={styles.cardBody}>
          <Skeleton width="50%" height={26} />
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
  cardBody: {
    gap: spacing.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  totalRow: {
    gap: 2,
    paddingVertical: spacing.sm,
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
  graphSkeleton: {
    gap: spacing.md,
  },
  edgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  appSkeleton: {
    gap: spacing.lg,
  },
  appRow: {
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  appHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  appName: {
    ...typography.body,
    flex: 1,
  },
  appValue: {
    ...typography.mono,
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
});
