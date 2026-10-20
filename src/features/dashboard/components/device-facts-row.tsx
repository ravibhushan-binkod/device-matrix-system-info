import { StyleSheet, Text, View } from 'react-native';

import { Card, SectionHeader } from '@/design-system/components';
import { useTheme } from '@/design-system/theme';
import { spacing, typography } from '@/design-system/tokens';
import { formatFirstApiLevel, formatDeviceAge } from '@/features/dashboard/services/device-facts';
import type { DashboardSummary } from '@/features/dashboard/types';

type FactProps = {
  label: string;
  value: string;
};

function Fact({ label, value }: FactProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.fact}>
      <Text style={[styles.factLabel, { color: colors.muted }]}>{label}</Text>
      <Text numberOfLines={2} style={[styles.factValue, { color: colors.text }]}>
        {value}
      </Text>
    </View>
  );
}

/** Build date, launch API level and an honest estimated model age. */
export function DeviceFactsRow({ summary }: { summary: DashboardSummary }) {
  const { colors } = useTheme();
  const facts = summary.facts.status === 'ok' ? summary.facts.value : null;

  return (
    <View>
      <View style={styles.header}>
        <SectionHeader title="Device facts" />
      </View>
      <View style={styles.wrap}>
        <Card style={styles.card} contentStyle={styles.cardContent}>
          <View style={styles.row}>
            <Fact label="Build date" value={facts?.buildDateLabel ?? 'Not reported'} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Fact
              label="First API"
              value={formatFirstApiLevel(facts?.firstApiLevel ?? null) ?? 'Not reported'}
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Fact
              label="Est. age"
              value={formatDeviceAge(facts?.estimatedAgeYears ?? null) ?? 'Not reported'}
            />
          </View>
          <Text style={[styles.note, { color: colors.muted }]}>
            Age is estimated from the Android version this model launched with — not the purchase
            date.
          </Text>
        </Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
  },
  wrap: {
    paddingHorizontal: spacing.lg,
  },
  card: {
    width: '100%',
  },
  cardContent: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.sm,
  },
  fact: {
    flex: 1,
    gap: 3,
  },
  factLabel: {
    ...typography.caption,
  },
  factValue: {
    ...typography.body,
    fontFamily: 'Inter_600SemiBold',
  },
  divider: {
    width: StyleSheet.hairlineWidth,
  },
  note: {
    ...typography.caption,
  },
});
