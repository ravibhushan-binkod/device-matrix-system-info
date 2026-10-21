import { useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';

import {
  AdSlot,
  Card,
  Chip,
  EmptyState,
  InfoSheet,
  Screen,
  SectionHeader,
  Skeleton,
  StatRow,
} from '@/design-system/components';
import type { StatusTone } from '@/design-system/status';
import { useTheme } from '@/design-system/theme';
import { spacing, typography, type AppColors } from '@/design-system/tokens';
import { ThermalGauge } from '@/design-system/visuals';
import { formatTemperature } from '@/core/utils/format-temperature';
import { useThermal } from '@/features/thermal/hooks/use-thermal';

const NOT_AVAILABLE = 'Not available on this device';

const HEAT_SHEET = {
  title: 'Heat: what this means',
  paragraphs: [
    '"Thermal load" turns Android’s own thermal headroom into a percentage: 0 % is cool, and 100 % means the system says it has no headroom left and starts slowing down or dimming. It is a status signal, not a temperature.',
    'The zone list comes from /sys/class/thermal — battery, skin and chip sensors each have their own zone. Many brands block apps from reading them, so only the zones this device allows are shown.',
    'Batteries are comfortable between roughly 15 °C and 40 °C. Above about 45 °C Android limits charging and performance, and long-term battery health suffers — that is when heat stops being "just a reading".',
  ],
};

function toneColor(tone: StatusTone, colors: AppColors): string {
  if (tone === 'critical') return colors.critical;
  if (tone === 'warning') return colors.warning;
  return colors.good;
}

/** Thermal: a headroom-based load gauge, readable zones and the battery temperature. */
export function ThermalScreen() {
  const { colors } = useTheme();
  const { info, refreshing, refresh } = useThermal();
  const [sheetVisible, setSheetVisible] = useState(false);

  const result = info;

  const thermalCopy =
    result?.status === 'ok'
      ? [
          result.value.statusLabel ? `Status: ${result.value.statusLabel}` : null,
          result.value.loadPercent == null ? null : `Thermal load: ${result.value.loadPercent}%`,
          result.value.headroomPercent == null
            ? null
            : `Headroom: ${result.value.headroomPercent}%`,
        ]
          .filter((line): line is string => line != null)
          .join('\n')
      : undefined;
  const zonesCopy =
    result?.status === 'ok' && result.value.zones.length > 0
      ? result.value.zones
          .map((zone) => `${zone.name}: ${zone.temperature ?? NOT_AVAILABLE}`)
          .join('\n')
      : undefined;
  const detailsCopy =
    result?.status === 'ok'
      ? [
          `Status: ${result.value.statusLabel ?? NOT_AVAILABLE}`,
          `Headroom: ${
            result.value.headroomPercent == null
              ? NOT_AVAILABLE
              : `${result.value.headroomPercent}%`
          }`,
          `Battery temperature: ${
            result.value.batteryTemperatureC == null
              ? NOT_AVAILABLE
              : formatTemperature(result.value.batteryTemperatureC, 'C', 1)
          }`,
        ].join('\n')
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
      {result === null ? (
        <ThermalSkeleton />
      ) : result.status === 'ok' ? (
        <>
          <View style={styles.group}>
            <SectionHeader
              title="Thermal load"
              copyText={thermalCopy}
              onInfo={() => setSheetVisible(true)}
            />
            <Card>
              <View style={styles.cardBody}>
                <View style={styles.cardHead}>
                  <Text style={[styles.sectionTitle, { color: colors.muted }]}>Headroom load</Text>
                  <Chip
                    label={result.value.statusLabel ?? 'Status unknown'}
                    dotColor={toneColor(result.value.tone, colors)}
                  />
                </View>
                {result.value.loadPercent != null ? (
                  <View style={styles.gaugeWrap}>
                    <ThermalGauge
                      value={result.value.loadPercent}
                      min={0}
                      max={100}
                      unit="%"
                      size={240}
                    />
                  </View>
                ) : (
                  <Text style={[styles.unavailableTitle, { color: colors.text }]}>
                    {NOT_AVAILABLE}
                  </Text>
                )}
                <Text style={[styles.caption, { color: colors.muted }]}>
                  Derived from Android&apos;s thermal headroom — 0 % is cool, 100 % means the system
                  reports no headroom left.
                </Text>
              </View>
            </Card>
          </View>

          <AdSlot placement="thermal-mid" />

          <View style={styles.group}>
            <SectionHeader
              title="Readable zones"
              copyText={zonesCopy}
              onInfo={() => setSheetVisible(true)}
            />
            <Card>
              <View style={styles.cardBody}>
                {result.value.zones.length > 0 ? (
                  <>
                    {result.value.zones.map((zone) => (
                      <StatRow
                        key={zone.key}
                        label={zone.name}
                        value={zone.temperature ?? NOT_AVAILABLE}
                        copyable={zone.temperature != null}
                      />
                    ))}
                    <Text style={[styles.caption, { color: colors.muted }]}>
                      Read from /sys/class/thermal — only the zones this device lets apps read.
                    </Text>
                  </>
                ) : (
                  <View style={styles.unavailable}>
                    <Text style={[styles.unavailableTitle, { color: colors.text }]}>
                      {NOT_AVAILABLE}
                    </Text>
                    <Text style={[styles.caption, { color: colors.muted }]}>
                      {result.value.zonesNote ??
                        'This device does not let apps read any thermal zone.'}
                    </Text>
                  </View>
                )}
              </View>
            </Card>
          </View>

          <View style={styles.group}>
            <SectionHeader title="Details" copyText={detailsCopy} />
            <Card>
              <View style={styles.cardBody}>
                <StatRow label="Status" value={result.value.statusLabel ?? NOT_AVAILABLE} />
                <StatRow
                  label="Headroom"
                  value={
                    result.value.headroomPercent == null
                      ? NOT_AVAILABLE
                      : `${result.value.headroomPercent}%`
                  }
                />
                <StatRow
                  label="Battery temperature"
                  value={
                    result.value.batteryTemperatureC == null
                      ? NOT_AVAILABLE
                      : formatTemperature(result.value.batteryTemperatureC, 'C', 1)
                  }
                />
              </View>
            </Card>
          </View>
        </>
      ) : (
        <EmptyState
          icon="thermometer"
          title="Thermal status"
          message={
            result.status === 'unavailable'
              ? result.reason
              : `Permission needed: ${result.permission}`
          }
        />
      )}

      <InfoSheet
        visible={sheetVisible}
        title={HEAT_SHEET.title}
        paragraphs={[...HEAT_SHEET.paragraphs]}
        onClose={() => setSheetVisible(false)}
      />
    </Screen>
  );
}

function ThermalSkeleton() {
  return (
    <View style={styles.content}>
      <Card>
        <View style={styles.cardBody}>
          <Skeleton width="45%" height={14} />
          <View style={styles.gaugeWrap}>
            <Skeleton width={240} height={136} />
          </View>
        </View>
      </Card>
      <Card>
        <View style={styles.cardBody}>
          {[0, 1, 2].map((row) => (
            <Skeleton key={row} height={16} />
          ))}
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
  group: {
    gap: spacing.sm,
  },
  cardBody: {
    gap: spacing.sm,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.caption,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  gaugeWrap: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  caption: {
    ...typography.caption,
  },
  unavailable: {
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  unavailableTitle: {
    ...typography.body,
  },
});
