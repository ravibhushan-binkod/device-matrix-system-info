import { StyleSheet, Text, View } from 'react-native';

import { Card, EmptyState, Screen, Skeleton, StatRow } from '@/design-system/components';
import { useTheme } from '@/design-system/theme';
import { spacing, typography } from '@/design-system/tokens';
import { LiveGraph } from '@/design-system/visuals';
import { useSensorStream } from '@/features/sensors/hooks/use-sensor-stream';
import { useSensors } from '@/features/sensors/hooks/use-sensors';
import {
  formatSensorValue,
  reportingModeLabel,
  sensorDetailValues,
  sensorFrequencyHz,
  sensorLabel,
} from '@/features/sensors/services/sensor-service';

const NOT_AVAILABLE = 'Not available on this device';

function formatPower(powerMa: number): string | null {
  if (!(powerMa > 0)) return null;
  return `${Math.round(powerMa * 100) / 100} mA`;
}

/** Live detail for one sensor; the native listener only runs while focused. */
export function SensorDetailScreen({ type }: { type: number | null }) {
  const { colors } = useTheme();
  const { sensors } = useSensors();
  const { reading, samples, streaming, error } = useSensorStream(type);

  const descriptor =
    sensors?.status === 'ok' && type != null
      ? (sensors.value.find((sensor) => sensor.type === type) ?? null)
      : null;

  const values = reading ? sensorDetailValues(reading.values) : null;
  const latest = samples.length > 0 ? samples[samples.length - 1] : null;
  const frequency = descriptor ? sensorFrequencyHz(descriptor.minDelayUs) : null;

  if (type == null) {
    return (
      <Screen scroll contentStyle={styles.content}>
        <EmptyState icon="sensors" title="Sensor" message="This link is missing its sensor type." />
      </Screen>
    );
  }

  return (
    <Screen scroll contentStyle={styles.content}>
      {sensors === null ? (
        <DetailSkeleton />
      ) : sensors.status !== 'ok' ? (
        <EmptyState
          icon="sensors"
          title="Sensor"
          message={
            sensors.status === 'unavailable'
              ? sensors.reason
              : `Permission needed: ${sensors.permission}`
          }
        />
      ) : descriptor === null ? (
        <EmptyState
          icon="sensors"
          title={`Sensor #${type}`}
          message="Android does not report this sensor on this device."
        />
      ) : (
        <>
          <View style={styles.head}>
            <Text style={[styles.title, { color: colors.text }]}>{sensorLabel(descriptor)}</Text>
            <Text style={[styles.caption, { color: colors.muted }]}>{descriptor.name}</Text>
          </View>

          <Card>
            <View style={styles.cardBody}>
              <Text style={[styles.sectionTitle, { color: colors.muted }]}>Live values</Text>
              {error ? (
                <View style={styles.unavailable}>
                  <Text style={[styles.unavailableTitle, { color: colors.text }]}>
                    {NOT_AVAILABLE}
                  </Text>
                  <Text style={[styles.caption, { color: colors.muted }]}>{error}</Text>
                </View>
              ) : values ? (
                <>
                  {values.map((value) => (
                    <StatRow
                      key={value.key}
                      label={value.label}
                      value={value.value}
                      copyable={false}
                    />
                  ))}
                  {streaming ? (
                    <Text style={[styles.caption, { color: colors.muted }]}>
                      Live · updates as the sensor reports
                    </Text>
                  ) : null}
                </>
              ) : (
                <Text style={[styles.caption, { color: colors.muted }]}>
                  Waiting for the first reading…
                </Text>
              )}
            </View>
          </Card>

          {error ? null : (
            <Card>
              <View style={styles.cardBody}>
                <Text style={[styles.sectionTitle, { color: colors.muted }]}>Magnitude</Text>
                <Text style={[styles.graphValue, { color: colors.text }]}>
                  {latest == null ? '—' : formatSensorValue(latest)}
                </Text>
                <LiveGraph
                  data={samples}
                  paused={!streaming}
                  accessibilityLabel="Sensor magnitude graph"
                />
              </View>
            </Card>
          )}

          <Card>
            <View style={styles.cardBody}>
              <Text style={[styles.sectionTitle, { color: colors.muted }]}>Details</Text>
              <StatRow
                label="Type"
                value={descriptor.stringType ?? NOT_AVAILABLE}
                copyable={descriptor.stringType != null}
              />
              <StatRow
                label="Vendor"
                value={descriptor.vendor.length > 0 ? descriptor.vendor : NOT_AVAILABLE}
                copyable={descriptor.vendor.length > 0}
              />
              <StatRow label="Version" value={String(descriptor.version)} copyable={false} />
              <StatRow
                label="Range"
                value={
                  descriptor.maxRange > 0 ? formatSensorValue(descriptor.maxRange) : NOT_AVAILABLE
                }
                copyable={false}
              />
              <StatRow
                label="Resolution"
                value={
                  descriptor.resolution > 0
                    ? formatSensorValue(descriptor.resolution)
                    : NOT_AVAILABLE
                }
                copyable={false}
              />
              <StatRow
                label="Power"
                value={formatPower(descriptor.powerMa) ?? NOT_AVAILABLE}
                copyable={false}
              />
              <StatRow
                label="Max rate"
                value={frequency == null ? NOT_AVAILABLE : `${frequency} Hz`}
                copyable={false}
              />
              <StatRow
                label="Reporting mode"
                value={reportingModeLabel(descriptor.reportingMode) ?? NOT_AVAILABLE}
                copyable={false}
              />
              <StatRow
                label="Wake-up"
                value={descriptor.isWakeUp ? 'Yes' : 'No'}
                copyable={false}
              />
            </View>
          </Card>
        </>
      )}
    </Screen>
  );
}

function DetailSkeleton() {
  return (
    <View style={styles.content}>
      <View style={styles.head}>
        <Skeleton width="55%" height={24} />
        <Skeleton width="75%" height={14} />
      </View>
      <Card>
        <View style={styles.cardBody}>
          <Skeleton width="35%" height={14} />
          <Skeleton height={16} />
          <Skeleton height={16} />
          <Skeleton height={16} />
        </View>
      </Card>
      <Card>
        <View style={styles.cardBody}>
          <Skeleton width="30%" height={14} />
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
  head: {
    gap: spacing.xs,
    paddingTop: spacing.sm,
  },
  title: {
    ...typography.title,
  },
  caption: {
    ...typography.caption,
  },
  cardBody: {
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.caption,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  graphValue: {
    ...typography.title,
    fontVariant: ['tabular-nums'],
  },
  unavailable: {
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  unavailableTitle: {
    ...typography.body,
  },
});
