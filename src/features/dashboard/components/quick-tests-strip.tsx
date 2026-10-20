import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/design-system/animations/pressable-scale';
import { Card, SectionHeader } from '@/design-system/components';
import { Icon, type IconName } from '@/design-system/icon';
import { useTheme } from '@/design-system/theme';
import { spacing, typography } from '@/design-system/tokens';
import { useHardwareResults } from '@/features/hardware-tests/hooks/use-hardware-results';
import {
  formatTestDate,
  testStatus,
  testStatusLabel,
} from '@/features/hardware-tests/services/results-service';
import type { HardwareTestId } from '@/features/hardware-tests/types';

type QuickTest = {
  /** Result key; display and touch tests write these ids. */
  resultId: HardwareTestId;
  title: string;
  icon: IconName;
  route:
    | '/hardware-tests/multitouch'
    | '/hardware-tests/display'
    | '/hardware-tests/flashlight'
    | '/hardware-tests/vibration';
};

const QUICK_TESTS: readonly QuickTest[] = [
  { resultId: 'multitouch', title: 'Touch', icon: 'pointer', route: '/hardware-tests/multitouch' },
  { resultId: 'display', title: 'Display', icon: 'display', route: '/hardware-tests/display' },
  {
    resultId: 'flashlight',
    title: 'Flashlight',
    icon: 'flashlight',
    route: '/hardware-tests/flashlight',
  },
  {
    resultId: 'vibration',
    title: 'Vibration',
    icon: 'vibrate',
    route: '/hardware-tests/vibration',
  },
];

function ActionLink({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={styles.action}
    >
      <Text style={[styles.actionText, { color: colors.accent }]}>{label}</Text>
      <Icon name="chevron-right" size={16} color={colors.accent} />
    </PressableScale>
  );
}

/** Four one-tap checks with the last saved result under each. */
export function QuickTestsStrip() {
  const router = useRouter();
  const { colors } = useTheme();
  const { results } = useHardwareResults();

  return (
    <View>
      <View style={styles.header}>
        <SectionHeader
          title="Quick tests"
          action={<ActionLink label="All tests" onPress={() => router.push('/hardware-tests')} />}
        />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
      >
        {QUICK_TESTS.map((test) => {
          const status = testStatus(results, test.resultId);
          const saved = results[test.resultId];
          const tone =
            status === 'pass' ? colors.good : status === 'fail' ? colors.critical : colors.muted;
          return (
            <Card
              key={test.resultId}
              onPress={() => router.push(test.route)}
              accessibilityLabel={`${test.title} test. ${testStatusLabel(status)}.`}
              accessibilityHint="Opens the test"
              style={styles.card}
              contentStyle={styles.cardContent}
            >
              <View style={styles.cardTop}>
                <View style={[styles.iconBadge, { backgroundColor: `${tone}1F` }]}>
                  <Icon name={test.icon} size={20} color={tone} />
                </View>
                <View style={[styles.statusDot, { backgroundColor: tone }]} />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>{test.title}</Text>
              <Text numberOfLines={2} style={[styles.result, { color: colors.muted }]}>
                {saved != null
                  ? `${testStatusLabel(status)} · ${formatTestDate(saved.testedAt)}`
                  : 'Not tested yet'}
              </Text>
            </Card>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
  },
  list: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xs,
  },
  card: {
    width: 144,
  },
  cardContent: {
    height: 120,
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  title: {
    ...typography.title,
  },
  result: {
    ...typography.caption,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  actionText: {
    ...typography.caption,
    fontFamily: 'Inter_600SemiBold',
  },
});
