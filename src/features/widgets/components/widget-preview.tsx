import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { AppLogo } from '@/design-system/components/brand-logo';
import { formatClockTime } from '@/core/units/format';
import type { ResolvedUnits } from '@/core/units';
import type { ColorScheme } from '@/design-system/tokens';
import type { DashboardSummary } from '@/features/dashboard/types';
import {
  WIDGET_TEXT,
  batteryStatusLabel,
  formatWidgetBytesPair,
  formatWidgetHealth,
  formatWidgetPercent,
  formatWidgetTemperature,
  type WidgetSpec,
} from '@/features/widgets/widget-spec';

type Props = {
  spec: WidgetSpec;
  summary: DashboardSummary | null;
  scheme: ColorScheme;
  accent: string;
  units: ResolvedUnits;
  width: number;
};

type Reading = {
  percent: number | null;
  usedBytes: number | null;
  totalBytes: number | null;
  availableBytes: number | null;
  percentLabel: string;
  pair: string;
  detail: string;
  status: string;
  unavailable: boolean;
};

function readingFor(
  spec: WidgetSpec,
  summary: DashboardSummary | null,
  units: ResolvedUnits,
): Reading {
  const binary = units.storage === 'binary';
  const unavailable = WIDGET_TEXT.notAvailable;

  if (spec.metric === 'health') {
    const health = summary?.health ?? null;
    return {
      percent: health?.score ?? null,
      usedBytes: null,
      totalBytes: null,
      availableBytes: null,
      percentLabel: health?.score == null ? '—' : String(Math.round(health.score)),
      pair: health == null ? unavailable : formatWidgetHealth(health.score, health.availableChecks),
      detail: health == null ? unavailable : `${health.availableChecks}/${health.totalChecks}`,
      status: health == null ? unavailable : `${health.availableChecks}/${health.totalChecks}`,
      unavailable: health?.score == null,
    };
  }

  if (spec.metric === 'battery') {
    const battery = summary?.battery.status === 'ok' ? summary.battery.value : null;
    const percent = battery?.percent ?? null;
    return {
      percent,
      usedBytes: null,
      totalBytes: null,
      availableBytes: null,
      percentLabel: percent == null ? '—' : formatWidgetPercent(percent),
      pair: percent == null ? unavailable : batteryStatusLabel(battery?.status ?? 'unknown'),
      detail:
        percent == null
          ? unavailable
          : formatWidgetTemperature(battery?.temperatureC ?? null, units.temperature),
      status: percent == null ? unavailable : batteryStatusLabel(battery?.status ?? 'unknown'),
      unavailable: percent == null,
    };
  }

  const overview =
    spec.metric === 'ram'
      ? summary?.memory.status === 'ok'
        ? summary.memory.value
        : null
      : summary?.storage.status === 'ok'
        ? summary.storage.value
        : null;
  if (overview == null) {
    return {
      percent: null,
      usedBytes: null,
      totalBytes: null,
      availableBytes: null,
      percentLabel: '—',
      pair: unavailable,
      detail: unavailable,
      status: unavailable,
      unavailable: true,
    };
  }
  const availableBytes = Math.max(0, overview.totalBytes - overview.usedBytes);
  return {
    percent: overview.percent,
    usedBytes: overview.usedBytes,
    totalBytes: overview.totalBytes,
    availableBytes,
    percentLabel: formatWidgetPercent(overview.percent),
    pair: formatWidgetBytesPair(overview.usedBytes, overview.totalBytes, binary),
    detail: `${formatWidgetBytesPair(overview.usedBytes, overview.totalBytes, binary)}`,
    status: `${formatWidgetByteSingle(availableBytes, binary)} ${WIDGET_TEXT.free}`,
    unavailable: false,
  };
}

/** Small local shim that keeps the available/free wording beside the pair. */
function formatWidgetByteSingle(bytes: number, binary: boolean): string {
  const pair = formatWidgetBytesPair(0, bytes, binary);
  return pair.split(' / ')[1] ?? pair;
}

function RingPreview({
  percent,
  color,
  track,
  text,
  muted,
  size,
}: {
  percent: number | null;
  color: string;
  track: string;
  text: string;
  muted: string;
  size: number;
}) {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent ?? 0));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={track} strokeWidth={8} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={8}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - clamped / 100)}
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <Text style={{ color: text, fontSize: Math.round(size * 0.22), fontFamily: 'Inter_700Bold' }}>
        {percent == null ? '—' : `${Math.round(percent)}%`}
      </Text>
      <Text style={{ color: muted, fontSize: Math.max(8, Math.round(size * 0.075)) }}>
        {WIDGET_TEXT.used}
      </Text>
    </View>
  );
}

export function WidgetPreview({ spec, summary, scheme, accent, units, width }: Props) {
  const dark = scheme === 'dark';
  const text = dark ? '#E8EEF5' : '#111827';
  const muted = dark ? '#B3C0CF' : '#475569';
  const card = dark ? '#101923' : '#FFFFFF';
  const border = dark ? 'rgba(232,238,245,0.14)' : 'rgba(17,24,39,0.12)';
  const track = dark ? 'rgba(232,238,245,0.16)' : 'rgba(17,24,39,0.12)';
  const accentSoft = `${accent}24`;
  const reading = readingFor(spec, summary, units);
  const height = Math.round(width / spec.aspectRatio);
  const compact = spec.tier === 'compact';
  const standard = spec.tier === 'standard';
  const detailed = spec.tier === 'detailed';
  const hero = spec.tier === 'hero';
  const pad = compact ? 9 : standard ? 12 : detailed ? 11 : 13;
  const valueSize = compact ? 22 : standard ? 28 : detailed ? 24 : 30;
  const titleSize = compact ? 9 : standard ? 10 : detailed ? 10 : 12;

  const title = spec.metricLabel;
  const clock = summary
    ? formatClockTime(
        new Date(summary.generatedAt).getHours(),
        new Date(summary.generatedAt).getMinutes(),
        units.timeFormat,
      )
    : '';

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${spec.title} live preview, ${spec.widthCells} by ${spec.heightCells} cells. ${reading.unavailable ? WIDGET_TEXT.notAvailable : reading.pair}`}
      style={[
        styles.card,
        {
          width,
          height,
          padding: pad,
          backgroundColor: card,
          borderColor: border,
        },
      ]}
    >
      {hero ? (
        <>
          <View style={styles.heroHeader}>
            <View style={styles.titleRow}>
              <LogoBadge size={22} background={accentSoft} />
              <View style={styles.titleCopy}>
                <Text
                  numberOfLines={1}
                  style={{ color: text, fontFamily: 'Inter_600SemiBold', fontSize: titleSize }}
                >
                  {WIDGET_TEXT.health}
                </Text>
                <Text numberOfLines={1} style={{ color: muted, fontSize: 8 }}>
                  {summary?.identity.status === 'ok' ? summary.identity.value.model : 'This device'}
                </Text>
              </View>
            </View>
            <Text style={{ color: text, fontFamily: 'Inter_600SemiBold', fontSize: 14 }}>
              {clock}
            </Text>
          </View>
          <View style={styles.heroBody}>
            <View style={styles.heroRing}>
              <RingPreview
                percent={reading.percent}
                color={accent}
                track={track}
                text={text}
                muted={muted}
                size={76}
              />
              <Text style={{ color: muted, fontSize: 8, marginTop: 3 }}>
                {reading.unavailable ? WIDGET_TEXT.notAvailable : WIDGET_TEXT.healthShort}
              </Text>
            </View>
            <View style={styles.heroMetrics}>
              <HeroMetric
                label="RAM"
                value={
                  summary?.memory.status === 'ok'
                    ? formatWidgetBytesPair(
                        summary.memory.value.usedBytes,
                        summary.memory.value.totalBytes,
                        units.storage === 'binary',
                      )
                    : WIDGET_TEXT.notAvailable
                }
                text={text}
                muted={muted}
              />
              <HeroMetric
                label="Storage"
                value={
                  summary?.storage.status === 'ok'
                    ? formatWidgetBytesPair(
                        summary.storage.value.usedBytes,
                        summary.storage.value.totalBytes,
                        units.storage === 'binary',
                      )
                    : WIDGET_TEXT.notAvailable
                }
                text={text}
                muted={muted}
              />
              <HeroMetric label="Battery" value={reading.status} text={text} muted={muted} />
            </View>
          </View>
          <Text numberOfLines={1} style={{ color: muted, fontSize: 8 }}>
            {WIDGET_TEXT.calculatedLocally}
          </Text>
        </>
      ) : (
        <>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <LogoBadge size={compact ? 16 : 20} background={accentSoft} />
              <Text
                numberOfLines={1}
                style={{ color: text, fontFamily: 'Inter_600SemiBold', fontSize: titleSize }}
              >
                {title}
              </Text>
            </View>
            {standard || detailed ? (
              <Text numberOfLines={1} style={{ color: muted, fontSize: compact ? 8 : 9 }}>
                {standard || detailed ? 'live' : ''}
              </Text>
            ) : null}
          </View>

          {compact ? (
            <View style={styles.compactBody}>
              <Text style={{ color: accent, fontFamily: 'Inter_700Bold', fontSize: valueSize }}>
                {reading.percentLabel}
              </Text>
              <View style={styles.compactCopy}>
                <Text
                  numberOfLines={1}
                  style={{ color: text, fontFamily: 'Inter_600SemiBold', fontSize: 9 }}
                >
                  {reading.pair}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{ color: reading.unavailable ? muted : muted, fontSize: 8 }}
                >
                  {reading.status}
                </Text>
              </View>
            </View>
          ) : standard ? (
            <View style={styles.standardBody}>
              <RingPreview
                percent={reading.percent}
                color={accent}
                track={track}
                text={text}
                muted={muted}
                size={Math.min(96, height - 78)}
              />
              <Text
                numberOfLines={1}
                style={{ color: text, fontSize: 9, fontFamily: 'Inter_600SemiBold' }}
              >
                {reading.pair}
              </Text>
              <Text numberOfLines={1} style={{ color: muted, fontSize: 8 }}>
                {reading.status}
              </Text>
            </View>
          ) : (
            <View style={styles.detailedBody}>
              <View style={styles.detailedNumbers}>
                <Text style={{ color: accent, fontFamily: 'Inter_700Bold', fontSize: valueSize }}>
                  {reading.percentLabel}
                </Text>
                <View style={styles.detailedCopy}>
                  <Text numberOfLines={1} style={{ color: text, fontSize: 9 }}>
                    {reading.pair}
                  </Text>
                  <Text numberOfLines={1} style={{ color: muted, fontSize: 8 }}>
                    {reading.status}
                  </Text>
                </View>
              </View>
              <View style={[styles.track, { backgroundColor: track }]}>
                <View
                  style={[
                    styles.fill,
                    {
                      width: `${Math.max(0, Math.min(100, reading.percent ?? 0))}%`,
                      backgroundColor: accent,
                    },
                  ]}
                />
              </View>
            </View>
          )}
        </>
      )}
    </View>
  );
}

function LogoBadge({ size, background }: { size: number; background: string }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.28),
        backgroundColor: background,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <AppLogo size={Math.max(10, size - 4)} decorative />
    </View>
  );
}

function HeroMetric({
  label,
  value,
  text,
  muted,
}: {
  label: string;
  value: string;
  text: string;
  muted: string;
}) {
  return (
    <View style={styles.heroMetric}>
      <Text style={{ color: muted, fontSize: 8 }}>{label}</Text>
      <Text numberOfLines={1} style={{ color: text, fontSize: 9, fontFamily: 'Inter_600SemiBold' }}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  titleCopy: {
    flexShrink: 1,
  },
  compactBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  compactCopy: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 1,
  },
  standardBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  detailedBody: {
    flex: 1,
    justifyContent: 'center',
    gap: 5,
  },
  detailedNumbers: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailedCopy: {
    flex: 1,
    gap: 1,
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  heroBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroRing: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroMetrics: {
    flex: 1,
    gap: 4,
  },
  heroMetric: {
    gap: 0,
  },
});
