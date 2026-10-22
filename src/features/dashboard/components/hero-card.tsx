import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { type SharedValue } from 'react-native-reanimated';

import { AuroraBackground } from '@/design-system/animations/aurora-background';
import { useParallaxStyle } from '@/design-system/animations/collapsing-header';
import { PressableScale } from '@/design-system/animations/pressable-scale';
import { withAlpha } from '@/design-system/color';
import { Icon } from '@/design-system/icon';
import { CopyableText, InfoSheet } from '@/design-system/components';
import { copyValue } from '@/design-system/copy/copy-value';
import { useTheme } from '@/design-system/theme';
import { radius, spacing, typography } from '@/design-system/tokens';
import { Ring } from '@/design-system/visuals';
import type { DashboardSummary, HealthCheckState } from '@/features/dashboard/types';

type Props = {
  summary: DashboardSummary;
  scrollY: SharedValue<number>;
};

const STATE_LABELS: Record<HealthCheckState, string> = {
  good: 'Good',
  warning: 'Watch',
  critical: 'Needs attention',
  unavailable: 'Not available on this device',
};

function capitalize(text: string): string {
  return text.length === 0 ? text : text.charAt(0).toUpperCase() + text.slice(1);
}

function healthColor(score: number, colors: ReturnType<typeof useTheme>['colors']): string {
  if (score >= 80) return colors.good;
  if (score >= 60) return colors.warning;
  return colors.critical;
}

function StatChip({ label, tone }: { label: string; tone?: string }) {
  const { colors } = useTheme();
  const tint = tone ?? colors.accent;
  return (
    <View
      style={[
        styles.chip,
        { backgroundColor: withAlpha(tint, 0.1), borderColor: withAlpha(tint, 0.22) },
      ]}
    >
      <View style={[styles.chipDot, { backgroundColor: tint }]} />
      <CopyableText
        value={label}
        copyLabel="Device info"
        numberOfLines={1}
        style={[styles.chipText, { color: colors.text }]}
      >
        {label}
      </CopyableText>
    </View>
  );
}

/**
 * The Home hero: where the phone says what it is, how long it has been up,
 * and one transparent health score with a sheet that explains every check.
 */
export function HeroCard({ summary, scrollY }: Props) {
  const { colors } = useTheme();
  const parallax = useParallaxStyle(scrollY, 46);
  const [infoOpen, setInfoOpen] = useState(false);

  const identity = summary.identity;
  const deviceName =
    identity.status === 'ok'
      ? [capitalize(identity.value.brand), identity.value.model].filter(Boolean).join(' ') ||
        'This device'
      : 'This device';
  const android =
    identity.status === 'ok' && identity.value.androidVersion
      ? `Android ${identity.value.androidVersion}`
      : 'Android version not reported';
  const patch = summary.facts.status === 'ok' ? summary.facts.value.securityPatch : null;
  const uptime = summary.uptime.status === 'ok' ? summary.uptime.value : null;
  const score = summary.health.score;
  const tint = score != null ? healthColor(score, colors) : colors.muted;

  const paragraphs = useMemo(() => {
    const read = summary.health.availableChecks;
    const checks = summary.health.checks
      .map((check) => `• ${check.label}: ${STATE_LABELS[check.state]}`)
      .join('\n');
    return [
      'The health score is calculated on this device from free storage, memory pressure, battery condition, thermal headroom and the security patch. Nothing leaves the phone.',
      `${read} of ${summary.health.totalChecks} checks could be read on this device. Missing checks are left out of the score instead of being guessed.`,
      checks,
      'A low score is a hint, not a diagnosis. Open a section to see the measured value behind it.',
    ];
  }, [summary.health]);

  return (
    <View
      style={[
        styles.hero,
        { backgroundColor: colors.surface, borderColor: withAlpha(colors.accent, 0.13) },
      ]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, styles.aurora, parallax]}>
        <AuroraBackground intensity={1} />
      </Animated.View>

      <View style={styles.body}>
        <View style={styles.top}>
          <View style={styles.copy}>
            <Text style={[styles.overline, { color: colors.accent }]}>DEVICE MATRIX</Text>
            <CopyableText
              value={deviceName}
              copyLabel="Device"
              numberOfLines={2}
              style={[styles.name, { color: colors.text }]}
            >
              {deviceName}
            </CopyableText>
            <View style={styles.chips}>
              <StatChip label={android} tone={colors.accent} />
              <StatChip
                label={patch != null ? `Patch ${patch}` : 'Patch not reported'}
                tone={patch != null ? colors.good : colors.muted}
              />
            </View>
            <View style={styles.uptimeRow}>
              <Icon name="clock" size={16} color={colors.muted} />
              <CopyableText
                value={uptime != null ? `Up ${uptime}` : 'Uptime not available'}
                copyLabel="Uptime"
                numberOfLines={1}
                style={[styles.uptime, { color: colors.muted }]}
              >
                {uptime != null ? `Up ${uptime}` : 'Uptime not available'}
              </CopyableText>
            </View>
          </View>

          <View style={styles.ringWrap}>
            {score != null ? (
              <Ring
                value={score}
                max={100}
                label="health"
                size={118}
                thickness={11}
                color={tint}
                accessibilityLabel={`Health score ${score} out of 100`}
                onLongPress={() => void copyValue(`Health score: ${score}/100`, 'Health score')}
              />
            ) : (
              <View
                accessible
                accessibilityLabel="Health score not available on this device"
                style={[styles.ringEmpty, { borderColor: withAlpha(colors.muted, 0.18) }]}
              >
                <Text style={[styles.ringEmptyValue, { color: colors.muted }]}>—</Text>
                <Text style={[styles.ringEmptyLabel, { color: colors.muted }]}>health</Text>
              </View>
            )}
            <PressableScale
              onPress={() => setInfoOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="How the health score is calculated"
              style={[styles.infoButton, { backgroundColor: colors.surface2 }]}
            >
              <Icon name="info" size={16} color={colors.muted} />
            </PressableScale>
          </View>
        </View>

        <View style={[styles.footer, { borderTopColor: withAlpha(colors.border, 0.75) }]}>
          <View style={styles.footerItem}>
            <View style={[styles.liveDot, { backgroundColor: tint }]} />
            <CopyableText
              value={
                score != null
                  ? `${summary.health.availableChecks}/${summary.health.totalChecks} checks read`
                  : 'No health checks available'
              }
              copyLabel="Health checks"
              style={[styles.footerText, { color: colors.muted }]}
            >
              {score != null
                ? `${summary.health.availableChecks}/${summary.health.totalChecks} checks read`
                : 'No health checks available'}
            </CopyableText>
          </View>
          <Text style={[styles.footerText, { color: colors.muted }]}>Calculated locally</Text>
        </View>
      </View>

      <InfoSheet
        visible={infoOpen}
        title="Health score"
        paragraphs={paragraphs}
        onClose={() => setInfoOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    minHeight: 340,
    borderRadius: radius.card,
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  aurora: {
    bottom: -60,
  },
  body: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
  },
  overline: {
    ...typography.caption,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 2,
  },
  name: {
    ...typography.display,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: radius.chip,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    maxWidth: '100%',
  },
  chipDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  chipText: {
    ...typography.caption,
    fontFamily: 'Inter_500Medium',
    flexShrink: 1,
  },
  uptimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  uptime: {
    ...typography.caption,
    flexShrink: 1,
  },
  ringWrap: {
    width: 118,
    height: 118,
  },
  ringEmpty: {
    width: 118,
    height: 118,
    borderRadius: 59,
    borderWidth: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringEmptyValue: {
    ...typography.display,
  },
  ringEmptyLabel: {
    ...typography.caption,
    textTransform: 'lowercase',
  },
  infoButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 1,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  footerText: {
    ...typography.caption,
  },
});
