import { StyleSheet, Text, View } from 'react-native';
import type { ReactNode } from 'react';

import { PressableScale } from '@/design-system/animations/pressable-scale';
import { Card, Chip, Screen } from '@/design-system/components';
import { withAlpha } from '@/design-system/color';
import { Icon } from '@/design-system/icon';
import { useTheme } from '@/design-system/theme';
import { radius, spacing, typography } from '@/design-system/tokens';
import {
  testStatus,
  testStatusLabel,
  formatTestDate,
} from '@/features/hardware-tests/services/results-service';
import type {
  HardwareTestDefinition,
  HardwareTestResults,
  HardwareTestStatus,
} from '@/features/hardware-tests/types';

type Flow = { position: number; total: number };

type Props = {
  definition: HardwareTestDefinition;
  results: HardwareTestResults;
  flow?: Flow | null;
  /** A live reason the test cannot run on this device right now. */
  runtimeUnavailable?: string | null;
  onPass: () => void;
  onFail: () => void;
  onRetest: () => void;
  onSkip?: () => void;
  children: ReactNode;
};

function statusColors(status: HardwareTestStatus, colors: ReturnType<typeof useTheme>['colors']) {
  if (status === 'pass') return { fg: colors.good, bg: withAlpha(colors.good, 0.14) };
  if (status === 'fail') return { fg: colors.critical, bg: withAlpha(colors.critical, 0.14) };
  return { fg: colors.muted, bg: colors.surface2 };
}

/**
 * Shared frame for every guided check: instruction, live visual, saved status
 * and the large Pass / Fail actions. Optional or unavailable tests never show
 * active result buttons.
 */
export function TestShell({
  definition,
  results,
  flow,
  runtimeUnavailable,
  onPass,
  onFail,
  onRetest,
  onSkip,
  children,
}: Props) {
  const { colors } = useTheme();
  const result = results[definition.id];
  const status = testStatus(results, definition.id);
  const statusStyle = statusColors(status, colors);
  const runnable = definition.availability === 'ready';
  const statusLabel = runnable
    ? testStatusLabel(status)
    : definition.availability === 'off'
      ? 'Off in this build'
      : 'Skipped on this device';
  const disabledReason =
    definition.availability !== 'ready' ? definition.unavailableReason : runtimeUnavailable;
  const canRecord = disabledReason == null;
  const progress = flow ? Math.round((flow.position / flow.total) * 100) : 0;

  return (
    <Screen scroll contentStyle={styles.content}>
      {flow ? (
        <View style={[styles.flow, { backgroundColor: colors.surface2 }]}>
          <View style={styles.flowRow}>
            <Text style={[styles.flowLabel, { color: colors.muted }]}>Guided check</Text>
            <Text style={[styles.flowCount, { color: colors.text }]}>
              {flow.position} of {flow.total}
            </Text>
          </View>
          <View style={[styles.track, { backgroundColor: colors.border }]}>
            <View
              style={[styles.trackFill, { width: `${progress}%`, backgroundColor: colors.accent }]}
            />
          </View>
        </View>
      ) : null}

      <View style={styles.titleRow}>
        <View style={[styles.iconBadge, { backgroundColor: withAlpha(colors.primary, 0.14) }]}>
          <Icon name={definition.icon} size={24} color={colors.primary} />
        </View>
        <View style={styles.titleCopy}>
          <Text style={[styles.title, { color: colors.text }]}>{definition.title}</Text>
          <Text style={[styles.group, { color: colors.muted }]}>{definition.group}</Text>
        </View>
      </View>

      <Text style={[styles.instruction, { color: colors.text }]}>{definition.instruction}</Text>

      {children}

      <View style={styles.statusRow}>
        <View style={[styles.statusPill, { backgroundColor: statusStyle.bg }]}>
          <Text style={[styles.statusText, { color: statusStyle.fg }]}>{statusLabel}</Text>
        </View>
        {runnable ? (
          result ? (
            <Text style={[styles.date, { color: colors.muted }]}>
              {formatTestDate(result.testedAt)}
            </Text>
          ) : (
            <Text style={[styles.date, { color: colors.muted }]}>Not tested yet</Text>
          )
        ) : (
          <Text style={[styles.date, { color: colors.muted }]}>Not counted in progress</Text>
        )}
        <View style={styles.statusSpacer} />
        {result && canRecord ? <Chip label="Retest" icon="refresh" onPress={onRetest} /> : null}
        {onSkip ? <Chip label="Skip" icon="chevron-right" onPress={onSkip} /> : null}
      </View>

      {disabledReason ? (
        <Card style={styles.noticeCard}>
          <View style={styles.noticeRow}>
            <Icon name="info" size={20} color={colors.warning} />
            <View style={styles.noticeCopy}>
              <Text style={[styles.noticeTitle, { color: colors.text }]}>Test skipped</Text>
              <Text style={[styles.noticeText, { color: colors.muted }]}>{disabledReason}</Text>
            </View>
          </View>
        </Card>
      ) : (
        <View style={styles.resultButtons}>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={`Mark ${definition.title} as passed`}
            haptic={false}
            onPress={onPass}
            style={[
              styles.resultButton,
              {
                backgroundColor: withAlpha(colors.good, 0.14),
                borderColor: withAlpha(colors.good, 0.45),
              },
            ]}
          >
            <Icon name="check" size={24} color={colors.good} />
            <Text style={[styles.resultText, { color: colors.good }]}>Pass</Text>
          </PressableScale>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={`Mark ${definition.title} as failed`}
            haptic={false}
            onPress={onFail}
            style={[
              styles.resultButton,
              {
                backgroundColor: withAlpha(colors.critical, 0.14),
                borderColor: withAlpha(colors.critical, 0.45),
              },
            ]}
          >
            <Icon name="x" size={24} color={colors.critical} />
            <Text style={[styles.resultText, { color: colors.critical }]}>Fail</Text>
          </PressableScale>
        </View>
      )}

      <Text style={[styles.footnote, { color: colors.muted }]}>
        Results stay on this phone. Nothing is uploaded.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  flow: {
    borderRadius: radius.button,
    padding: spacing.md,
    gap: spacing.sm,
  },
  flowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  flowLabel: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  flowCount: {
    ...typography.caption,
  },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    borderRadius: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleCopy: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...typography.title,
  },
  group: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  instruction: {
    ...typography.body,
    lineHeight: 23,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  statusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.chip,
  },
  statusText: {
    ...typography.caption,
  },
  date: {
    ...typography.caption,
  },
  statusSpacer: {
    flex: 1,
  },
  noticeCard: {
    marginTop: spacing.xs,
  },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  noticeCopy: {
    flex: 1,
    gap: 2,
  },
  noticeTitle: {
    ...typography.caption,
  },
  noticeText: {
    ...typography.caption,
    lineHeight: 18,
  },
  resultButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  resultButton: {
    flex: 1,
    minHeight: 68,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  resultText: {
    ...typography.title,
  },
  footnote: {
    ...typography.caption,
    textAlign: 'center',
  },
});
