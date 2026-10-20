import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { Shimmer } from '@/design-system/animations/shimmer';
import { PressableScale } from '@/design-system/animations/pressable-scale';
import { Button, Card, SectionHeader } from '@/design-system/components';
import { Icon } from '@/design-system/icon';
import { useTheme } from '@/design-system/theme';
import { radius, spacing, typography } from '@/design-system/tokens';
import { useTips } from '@/features/tips/hooks/use-tips';
import type { TipSeverity } from '@/features/tips/types';

const CARD_GAP = spacing.md;

function severityTone(
  severity: TipSeverity,
  colors: ReturnType<typeof useTheme>['colors'],
): string {
  if (severity === 'critical') return colors.critical;
  if (severity === 'warning') return colors.warning;
  return colors.accent;
}

/** Top three checkup tips, one swipe at a time, each with its fix. */
export function TipsCarousel() {
  const { colors } = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { status, report, notice, run, openFix } = useTips();
  const cardWidth = Math.min(334, width - spacing.lg * 2 - 24);

  useEffect(() => {
    run();
  }, [run]);

  const tips = report?.tips.slice(0, 3) ?? [];

  return (
    <View>
      <View style={styles.header}>
        <SectionHeader
          title="Tips for this phone"
          action={
            <PressableScale
              onPress={() => router.push('/tips')}
              accessibilityRole="button"
              accessibilityLabel="All tips"
              hitSlop={8}
              style={styles.action}
            >
              <Text style={[styles.actionText, { color: colors.accent }]}>All tips</Text>
              <Icon name="chevron-right" size={16} color={colors.accent} />
            </PressableScale>
          }
        />
      </View>

      {status === 'running' ? (
        <View style={styles.list}>
          <Shimmer width={cardWidth} height={188} />
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={cardWidth + CARD_GAP}
          decelerationRate="fast"
          contentContainerStyle={styles.list}
        >
          {tips.length === 0 ? (
            <Card style={[styles.card, { width: cardWidth }]} contentStyle={styles.cardContent}>
              <View style={styles.allClear}>
                <View style={[styles.iconBadge, { backgroundColor: `${colors.good}1F` }]}>
                  <Icon name="check" size={20} color={colors.good} />
                </View>
                <Text style={[styles.title, { color: colors.text }]}>Nothing needs attention</Text>
                <Text style={[styles.body, { color: colors.muted }]}>
                  The checkup did not find a value worth changing on this phone right now.
                </Text>
              </View>
            </Card>
          ) : (
            tips.map((tip) => {
              const tone = severityTone(tip.severity, colors);
              return (
                <Card
                  key={tip.id}
                  style={[styles.card, { width: cardWidth }]}
                  contentStyle={styles.cardContent}
                >
                  <View style={styles.cardTop}>
                    <View
                      style={[
                        styles.iconBadge,
                        { backgroundColor: `${tone}1F`, borderColor: `${tone}38` },
                      ]}
                    >
                      <Icon name="tips" size={20} color={tone} />
                    </View>
                    <View style={[styles.severity, { backgroundColor: `${tone}1A` }]}>
                      <Text style={[styles.severityText, { color: tone }]}>
                        {tip.severity === 'critical'
                          ? 'Needs attention'
                          : tip.severity === 'warning'
                            ? 'Worth checking'
                            : 'Tip'}
                      </Text>
                    </View>
                  </View>
                  <Text numberOfLines={2} style={[styles.title, { color: colors.text }]}>
                    {tip.title}
                  </Text>
                  <Text numberOfLines={3} style={[styles.body, { color: colors.muted }]}>
                    {tip.body}
                  </Text>
                  <Button
                    title={tip.fix != null ? 'Fix it' : 'Open tips'}
                    variant={tip.fix != null ? 'secondary' : 'ghost'}
                    icon={tip.fix != null ? 'settings' : 'chevron-right'}
                    onPress={() => {
                      if (tip.fix != null) openFix(tip.fix);
                      else router.push('/tips');
                    }}
                    style={styles.button}
                  />
                </Card>
              );
            })
          )}
        </ScrollView>
      )}

      {notice ? (
        <Text style={[styles.notice, { color: colors.warning }]} accessibilityLiveRegion="polite">
          {notice}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
  },
  list: {
    paddingHorizontal: spacing.lg,
    gap: CARD_GAP,
    paddingBottom: spacing.xs,
  },
  card: {
    width: '100%',
  },
  cardContent: {
    minHeight: 188,
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  severity: {
    borderRadius: radius.chip,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  severityText: {
    ...typography.caption,
    fontFamily: 'Inter_600SemiBold',
  },
  title: {
    ...typography.title,
  },
  body: {
    ...typography.body,
    flexGrow: 1,
  },
  button: {
    height: 40,
    minHeight: 40,
  },
  allClear: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.sm,
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
  notice: {
    ...typography.caption,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
});
