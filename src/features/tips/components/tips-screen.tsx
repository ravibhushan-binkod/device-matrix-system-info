import { StyleSheet, Text, View } from 'react-native';

import { StaggerItem } from '@/design-system/animations/stagger';
import { Button, Card, Screen, SectionHeader } from '@/design-system/components';
import { withAlpha } from '@/design-system/color';
import { Icon } from '@/design-system/icon';
import { useTheme } from '@/design-system/theme';
import { radius, spacing, typography } from '@/design-system/tokens';
import { CheckupAnimation, CheckupIntro } from '@/features/tips/components/checkup-panel';
import { TipListCard } from '@/features/tips/components/tip-list-card';
import { useTips } from '@/features/tips/hooks/use-tips';

/** The check-up screen: run every rule, list the findings, offer the fixes. */
export function TipsScreen() {
  const { status, report, notice, run, openFix } = useTips();
  const { colors } = useTheme();
  const tips = report?.tips ?? [];

  return (
    <Screen scroll contentStyle={styles.content}>
      {status === 'idle' ? <CheckupIntro onRun={run} /> : null}
      {status === 'running' ? <CheckupAnimation /> : null}

      {status === 'done' && report && tips.length === 0 ? (
        <Card style={styles.hero}>
          <View style={[styles.heroBadge, { backgroundColor: withAlpha(colors.good, 0.14) }]}>
            <Icon name="check" size={24} color={colors.good} />
          </View>
          <Text style={[styles.heroTitle, { color: colors.text }]}>All good</Text>
          <Text style={[styles.heroBody, { color: colors.muted }]}>
            The check-up found nothing worth fixing on this device.
          </Text>
          <Button title="Run again" variant="secondary" icon="search" onPress={run} />
        </Card>
      ) : null}

      {status === 'done' && report && tips.length > 0 ? (
        <>
          <SectionHeader
            title={tips.length === 1 ? '1 thing to look at' : `${tips.length} things to look at`}
          />
          {tips.map((tip, index) => (
            <StaggerItem key={tip.id} index={index}>
              <TipListCard tip={tip} onFix={openFix} />
            </StaggerItem>
          ))}
          <Button title="Run again" variant="secondary" icon="search" onPress={run} />
        </>
      ) : null}

      {status === 'done' && report && report.missingReadings > 0 ? (
        <Text style={[styles.note, { color: colors.muted }]}>
          {report.missingReadings === 1
            ? '1 reading was not available on this device, so that check was skipped.'
            : `${report.missingReadings} readings were not available on this device, so those checks were skipped.`}
        </Text>
      ) : null}

      {notice ? <Text style={[styles.note, { color: colors.warning }]}>{notice}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  hero: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  heroBadge: {
    width: 64,
    height: 64,
    borderRadius: radius.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    ...typography.title,
  },
  heroBody: {
    ...typography.body,
    textAlign: 'center',
  },
  note: {
    ...typography.caption,
  },
});
