import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';

import { Button, Card, EmptyState, Screen, SectionHeader } from '@/design-system/components';
import { withAlpha } from '@/design-system/color';
import { Icon } from '@/design-system/icon';
import { useTheme } from '@/design-system/theme';
import { radius, spacing, typography } from '@/design-system/tokens';
import { Ring } from '@/design-system/visuals';
import { features, isEnabled } from '@/core/features';
import {
  HARDWARE_TEST_GROUPS,
  RUNNABLE_HARDWARE_TESTS,
  firstPendingTest,
  testsInGroup,
} from '@/features/hardware-tests/services/test-catalog';
import {
  buildChecklistText,
  formatTestDate,
  summarizeResults,
  testStatus,
  testStatusLabel,
} from '@/features/hardware-tests/services/results-service';
import { useHardwareResults } from '@/features/hardware-tests/hooks/use-hardware-results';
import type {
  HardwareTestDefinition,
  HardwareTestResults,
  HardwareTestStatus,
} from '@/features/hardware-tests/types';

function StatusBadge({
  definition,
  status,
}: {
  definition: HardwareTestDefinition;
  status: HardwareTestStatus;
}) {
  const { colors } = useTheme();
  const unavailable = definition.availability !== 'ready';
  const fg = unavailable
    ? colors.muted
    : status === 'pass'
      ? colors.good
      : status === 'fail'
        ? colors.critical
        : colors.muted;
  const bg = unavailable
    ? colors.surface2
    : status === 'pass'
      ? withAlpha(colors.good, 0.14)
      : status === 'fail'
        ? withAlpha(colors.critical, 0.14)
        : colors.surface2;
  const label = unavailable
    ? definition.availability === 'off'
      ? 'Off in build'
      : 'Skipped'
    : testStatusLabel(status);
  const icon = unavailable
    ? 'minus'
    : status === 'pass'
      ? 'check'
      : status === 'fail'
        ? 'x'
        : 'minus';

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Icon name={icon} size={16} color={fg} />
      <Text style={[styles.badgeText, { color: fg }]}>{label}</Text>
    </View>
  );
}

function TestRow({
  definition,
  results,
  onPress,
}: {
  definition: HardwareTestDefinition;
  results: HardwareTestResults;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const result = results[definition.id];
  const status = testStatus(results, definition.id);
  const accent =
    definition.availability !== 'ready'
      ? colors.muted
      : status === 'pass'
        ? colors.good
        : status === 'fail'
          ? colors.critical
          : colors.primary;

  return (
    <Card onPress={onPress}>
      <View style={styles.row}>
        <View style={[styles.rowIcon, { backgroundColor: withAlpha(accent, 0.12) }]}>
          <Icon name={definition.icon} size={20} color={accent} />
        </View>
        <View style={styles.rowCopy}>
          <Text style={[styles.rowTitle, { color: colors.text }]}>{definition.shortTitle}</Text>
          <Text style={[styles.rowSub, { color: colors.muted }]}>
            {result
              ? formatTestDate(result.testedAt)
              : definition.availability === 'ready'
                ? definition.automated
                  ? 'Live check · still needs your confirmation'
                  : 'Manual check'
                : 'Not part of this checkup'}
          </Text>
        </View>
        <StatusBadge definition={definition} status={status} />
        <Icon name="chevron-right" size={20} color={colors.muted} />
      </View>
    </Card>
  );
}

export function HardwareTestsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { results } = useHardwareResults();
  const [shareError, setShareError] = useState<string | null>(null);
  const summary = summarizeResults(results);
  const tested = summary.passed + summary.failed;

  if (!isEnabled(features.hardwareTests)) {
    return (
      <Screen>
        <EmptyState
          icon="wrench"
          title="Hardware tests are off"
          message="This feature is currently disabled in this build."
        />
      </Screen>
    );
  }

  const openTest = (id: HardwareTestDefinition['id']) => {
    router.push({ pathname: '/hardware-tests/[test]', params: { test: id } });
  };

  const startFlow = () => {
    router.push({
      pathname: '/hardware-tests/[test]',
      params: { test: firstPendingTest(results), flow: '1' },
    });
  };

  const shareChecklist = async () => {
    setShareError(null);
    try {
      await Share.share({ message: buildChecklistText(results) });
    } catch {
      setShareError('The share sheet could not be opened on this device.');
    }
  };

  return (
    <Screen scroll contentStyle={styles.content}>
      <Text style={[styles.intro, { color: colors.muted }]}>
        The checks a buyer would run on a used phone: screen, touch, sound, sensors, ports and
        radios. Results are saved on this phone and you can retest any check.
      </Text>

      <Card style={styles.progressCard}>
        <View style={styles.progressRow}>
          <Ring
            value={tested}
            max={summary.total}
            label={`of ${summary.total} tested`}
            color={colors.accent}
            size={156}
            thickness={13}
            accessibilityLabel={`${tested} of ${summary.total} hardware checks tested`}
          />
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.good }]}>{summary.passed}</Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>Passed</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.critical }]}>{summary.failed}</Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>Failed</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.text }]}>{summary.untested}</Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>Untested</Text>
            </View>
          </View>
        </View>

        <Button
          title={tested === 0 ? 'Run all tests' : 'Continue checkup'}
          icon="play"
          onPress={startFlow}
        />
        <Button
          title="Share used-phone checklist"
          variant="secondary"
          icon="share"
          onPress={() => void shareChecklist()}
        />
        {shareError ? (
          <Text style={[styles.shareError, { color: colors.warning }]}>{shareError}</Text>
        ) : null}
        <Text style={[styles.progressNote, { color: colors.muted }]}>
          {RUNNABLE_HARDWARE_TESTS.length} guided checks. Optional checks that are off or skipped
          are shown with the reason, but do not count towards progress.
        </Text>
      </Card>

      {HARDWARE_TEST_GROUPS.map((group) => {
        const tests = testsInGroup(group);
        if (tests.length === 0) return null;
        return (
          <View key={group} style={styles.group}>
            <SectionHeader title={group} />
            <View style={styles.rows}>
              {tests.map((definition) => (
                <TestRow
                  key={definition.id}
                  definition={definition}
                  results={results}
                  onPress={() => openTest(definition.id)}
                />
              ))}
            </View>
          </View>
        );
      })}

      <Text style={[styles.footnote, { color: colors.muted }]}>
        These are ordinary Android checks. Nothing is uploaded and no test changes a system setting:
        where Android requires a settings trip, the test opens the right system screen.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  intro: {
    ...typography.body,
    lineHeight: 21,
  },
  progressCard: {
    gap: spacing.md,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stats: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    ...typography.title,
    fontSize: 24,
    lineHeight: 30,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    ...typography.caption,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 32,
  },
  shareError: {
    ...typography.caption,
    textAlign: 'center',
  },
  progressNote: {
    ...typography.caption,
    lineHeight: 18,
  },
  group: {
    gap: spacing.sm,
  },
  rows: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowCopy: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    ...typography.body,
    fontFamily: 'Inter_600SemiBold',
  },
  rowSub: {
    ...typography.caption,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.chip,
  },
  badgeText: {
    ...typography.caption,
    fontFamily: 'Inter_600SemiBold',
  },
  footnote: {
    ...typography.caption,
    lineHeight: 18,
  },
});
