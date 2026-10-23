import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, SectionHeader } from '@/design-system/components';
import { useTheme } from '@/design-system/theme';
import { spacing, typography } from '@/design-system/tokens';
import {
  getBatteryInfo,
  getMemoryInfo,
  getStorageInfo,
  getThermalStatus,
  getUptime,
  subscribeToBattery,
  type BatteryReading,
} from '@/core/native';
import type { Result } from '@/core/result';
import { formatBytes } from '@/core/utils/format-bytes';
import { getActiveUnits } from '@/core/units/active';
import { formatTemperature } from '@/core/units/format';

type Line = { label: string; value: string };

/** Temporary Phase 5 verification: logs every native reading to Metro/logcat. */
export function logNativeProbe(): void {
  const report: Record<string, Result<unknown>> = {
    memory: getMemoryInfo(),
    storage: getStorageInfo(),
    uptime: getUptime(),
    thermal: getThermalStatus(),
    battery: getBatteryInfo(),
  };
  Object.entries(report).forEach(([name, result]) => {
    console.log(`[native-probe] ${name} ${JSON.stringify(result)}`);
  });
}

function inspect<T>(label: string, result: Result<T>, render: (value: T) => string): Line {
  if (result.status === 'ok') return { label, value: render(result.value) };
  if (result.status === 'unavailable') return { label, value: `unavailable — ${result.reason}` };
  return { label, value: `denied — ${result.permission}` };
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  return `${days}d ${hours}h ${minutes}m`;
}

function summarize(reading: BatteryReading) {
  return {
    percent: reading.percent,
    status: reading.status,
    plugged: reading.plugged,
    temperatureC: reading.temperatureC,
    currentNowUa: reading.currentNowUa,
  };
}

function collect(): Line[] {
  const memory = getMemoryInfo();
  const storage = getStorageInfo();
  const thermal = getThermalStatus();
  const battery = getBatteryInfo();

  const lines: Line[] = [
    inspect('Memory', memory, (value) =>
      [
        `${formatBytes(value.totalBytes, { style: 'decimal' })} total`,
        `${formatBytes(value.availableBytes, { style: 'decimal' })} available`,
        `${formatBytes(value.thresholdBytes, { style: 'decimal' })} threshold`,
        `low memory: ${value.lowMemory ? 'yes' : 'no'}`,
      ].join(' · '),
    ),
    inspect('Storage internal', storage, (value) =>
      value.internal
        ? `${formatBytes(value.internal.totalBytes, { style: 'decimal' })} total · ${formatBytes(
            value.internal.freeBytes,
            { style: 'decimal' },
          )} free`
        : 'unavailable',
    ),
    inspect('Storage volumes', storage, (value) =>
      value.volumes.length === 0
        ? 'none reported'
        : value.volumes
            .map((volume) => {
              const size =
                volume.totalBytes != null
                  ? `${formatBytes(volume.totalBytes, { style: 'decimal' })} / ${formatBytes(
                      volume.freeBytes ?? 0,
                      { style: 'decimal' },
                    )} free`
                  : 'size unavailable';
              const flags = [
                volume.state,
                volume.isRemovable ? 'removable' : null,
                volume.isPrimary ? 'primary' : null,
                volume.path,
              ]
                .filter(Boolean)
                .join(' · ');
              return `${volume.description ?? volume.uuid ?? 'unnamed'} — ${size} · ${flags}`;
            })
            .join('\n'),
    ),
    inspect(
      'Uptime',
      getUptime(),
      (value) => `${formatDuration(value.uptimeMillis)} (${value.uptimeMillis} ms)`,
    ),
    inspect('Thermal', thermal, (value) =>
      [
        `status: ${value.status ?? 'unavailable'}${value.statusCode != null ? ` (${value.statusCode})` : ''}`,
        value.headroom != null
          ? `headroom: ${value.headroom.toFixed(2)} (${value.headroomForecastSeconds}s)`
          : 'headroom: unavailable',
      ].join(' · '),
    ),
    inspect('Battery', battery, (value) =>
      [
        `${value.percent != null ? `${value.percent.toFixed(0)}%` : 'percent n/a'}`,
        value.status,
        `plugged: ${value.plugged}`,
        `health: ${value.health}`,
        value.temperatureC != null
          ? formatTemperature(value.temperatureC, getActiveUnits().temperature, 1)
          : 'temperature n/a',
        value.voltageMv != null ? `${value.voltageMv} mV` : 'voltage n/a',
        value.technology ?? 'technology n/a',
      ].join(' · '),
    ),
    inspect('Battery extras', battery, (value) =>
      [
        value.currentNowUa != null ? `current ${value.currentNowUa} µA` : 'current n/a',
        value.chargeCounterUah != null ? `charge ${value.chargeCounterUah} µAh` : 'charge n/a',
        value.cycleCount != null ? `cycles ${value.cycleCount}` : 'cycles n/a',
        `power saver: ${value.powerSave ? 'on' : 'off'}`,
      ].join(' · '),
    ),
  ];

  return lines;
}

/** Dev-only probe card: runs every wrapper, logs the results and shows them inline. */
export function NativeProbe() {
  const { colors } = useTheme();
  const [lines, setLines] = useState<Line[]>(collect);
  const [events, setEvents] = useState(0);

  const refresh = useCallback(() => {
    logNativeProbe();
    setLines(collect());
  }, []);

  useEffect(() => {
    logNativeProbe();
    const subscription = subscribeToBattery((reading) => {
      setEvents((count) => count + 1);
      console.log(`[native-probe] battery-event ${JSON.stringify(summarize(reading))}`);
    });
    return () => {
      if (subscription.status === 'ok') {
        subscription.value.remove();
      }
    };
  }, []);

  return (
    <>
      <SectionHeader title="Native probe" />
      <Card>
        {lines.map((line) => (
          <View key={line.label} style={styles.row}>
            <Text style={[typography.caption, { color: colors.muted }]}>{line.label}</Text>
            <Text selectable style={[typography.mono, { color: colors.text }]}>
              {line.value}
            </Text>
          </View>
        ))}
        <Text style={[typography.caption, { color: colors.muted }]}>
          Battery events received: {events}
        </Text>
        <View style={styles.action}>
          <Button title="Log again" variant="secondary" onPress={refresh} />
        </View>
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  action: {
    marginTop: spacing.sm,
  },
});
