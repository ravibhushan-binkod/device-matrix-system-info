import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/design-system/animations/pressable-scale';
import { Shimmer } from '@/design-system/animations/shimmer';
import { Button, Card, CopyableText, SectionHeader } from '@/design-system/components';
import { withAlpha } from '@/design-system/color';
import { Icon } from '@/design-system/icon';
import { useTheme } from '@/design-system/theme';
import { radius, spacing, typography } from '@/design-system/tokens';
import { useSystemSettings } from '@/core/hooks/use-system-settings';
import { formatUptime } from '@/core/utils/format-duration';
import { useTodayUsage } from '@/features/dashboard/hooks/use-today-usage';

const DOT_COLORS = ['accent', 'violet', 'primary', 'good'] as const;
const NOT_AVAILABLE = 'Not available on this device';

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

/** Today's foreground app time, or the honest Usage Access call to action. */
export function TodayUsageCard() {
  const { colors } = useTheme();
  const router = useRouter();
  const { usage, loading } = useTodayUsage();
  const { notice, open } = useSystemSettings();

  const dotColor = (index: number): string => {
    switch (DOT_COLORS[index % DOT_COLORS.length]) {
      case 'violet':
        return colors.violet;
      case 'primary':
        return colors.primary;
      case 'good':
        return colors.good;
      default:
        return colors.accent;
    }
  };

  const usageCopy =
    usage?.granted && usage.apps.length > 0
      ? [
          `Screen time today: ${
            usage.totalTimeMs != null ? formatUptime(usage.totalTimeMs) : NOT_AVAILABLE
          }`,
          ...usage.apps.map((app) => `${app.label}: ${formatUptime(app.totalTimeMs)}`),
        ].join('\n')
      : undefined;

  return (
    <View>
      <View style={styles.header}>
        <SectionHeader
          title="Most used today"
          copyText={usageCopy}
          action={<ActionLink label="Details" onPress={() => router.push('/screen-time')} />}
        />
      </View>
      <View style={styles.wrap}>
        <Card style={styles.card} contentStyle={styles.cardContent}>
          {loading && usage == null ? (
            <View style={styles.loading}>
              <Shimmer height={16} width="45%" />
              <Shimmer height={48} />
              <Shimmer height={48} />
            </View>
          ) : usage == null || !usage.granted ? (
            <View style={styles.permission}>
              <View
                style={[styles.permissionIcon, { backgroundColor: withAlpha(colors.accent, 0.1) }]}
              >
                <Icon name="clock" size={24} color={colors.accent} />
              </View>
              <View style={styles.permissionCopy}>
                <Text style={[styles.permissionTitle, { color: colors.text }]}>
                  Enable to see today’s app time
                </Text>
                <Text style={[styles.body, { color: colors.muted }]}>
                  Usage Access lets Android show which apps were in front and for how long. The data
                  stays on this phone.
                </Text>
              </View>
              <Button
                title="Enable"
                icon="settings"
                onPress={() => open('usage-access')}
                style={styles.enableButton}
              />
            </View>
          ) : usage.apps.length === 0 ? (
            <Text style={[styles.body, { color: colors.muted }]}>
              {usage.reason ?? 'No foreground time recorded yet today.'}
            </Text>
          ) : (
            <>
              <View style={styles.totalRow}>
                <Text style={[styles.totalLabel, { color: colors.muted }]}>Screen time today</Text>
                <CopyableText
                  value={usage.totalTimeMs != null ? formatUptime(usage.totalTimeMs) : null}
                  copyLabel="Screen time today"
                  style={[styles.totalValue, { color: colors.text }]}
                >
                  {usage.totalTimeMs != null ? formatUptime(usage.totalTimeMs) : '—'}
                </CopyableText>
              </View>
              <View style={styles.rows}>
                {usage.apps.map((app, index) => {
                  const ratio =
                    usage.apps[0] != null && usage.apps[0].totalTimeMs > 0
                      ? app.totalTimeMs / usage.apps[0].totalTimeMs
                      : 0;
                  const tone = dotColor(index);
                  return (
                    <View key={app.packageName} style={styles.row}>
                      <View style={[styles.appLetter, { backgroundColor: withAlpha(tone, 0.14) }]}>
                        <Text style={[styles.appLetterText, { color: tone }]}>
                          {app.label.slice(0, 1).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.appCopy}>
                        <View style={styles.appTop}>
                          <CopyableText
                            value={app.label}
                            copyLabel="App"
                            numberOfLines={1}
                            style={[styles.appName, { color: colors.text }]}
                          >
                            {app.label}
                          </CopyableText>
                          <CopyableText
                            value={formatUptime(app.totalTimeMs)}
                            copyLabel={app.label}
                            style={[styles.appTime, { color: colors.muted }]}
                          >
                            {formatUptime(app.totalTimeMs)}
                          </CopyableText>
                        </View>
                        <View style={[styles.track, { backgroundColor: colors.surface2 }]}>
                          <View
                            style={[
                              styles.fill,
                              { width: `${Math.max(4, ratio * 100)}%`, backgroundColor: tone },
                            ]}
                          />
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </>
          )}
          {usage?.granted && usage.reason != null && usage.apps.length > 0 ? (
            <Text style={[styles.hint, { color: colors.muted }]}>{usage.reason}</Text>
          ) : null}
        </Card>
        {notice ? <Text style={[styles.notice, { color: colors.warning }]}>{notice}</Text> : null}
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
    gap: spacing.sm,
  },
  loading: {
    gap: spacing.sm,
  },
  permission: {
    gap: spacing.sm,
  },
  permissionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionCopy: {
    gap: spacing.xs,
  },
  permissionTitle: {
    ...typography.title,
  },
  body: {
    ...typography.body,
  },
  enableButton: {
    alignSelf: 'flex-start',
    minWidth: 120,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  totalLabel: {
    ...typography.caption,
  },
  totalValue: {
    ...typography.title,
    fontVariant: ['tabular-nums'],
  },
  rows: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  appLetter: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appLetterText: {
    ...typography.title,
  },
  appCopy: {
    flex: 1,
    gap: 5,
  },
  appTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  appName: {
    ...typography.body,
    flex: 1,
  },
  appTime: {
    ...typography.caption,
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: 3,
    borderRadius: radius.chip,
    overflow: 'hidden',
  },
  fill: {
    height: 3,
    borderRadius: radius.chip,
  },
  hint: {
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
  notice: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
});
