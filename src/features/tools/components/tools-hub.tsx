import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { Card, Chip, Screen, SectionHeader } from '@/design-system/components';
import { withAlpha } from '@/design-system/color';
import { Icon, type IconName } from '@/design-system/icon';
import { useTheme } from '@/design-system/theme';
import { radius, spacing, typography } from '@/design-system/tokens';
import { useTorch } from '@/features/tools/hooks/use-torch';
import {
  readVibrationSupport,
  runVibrationPattern,
  showAlarms,
  stopVibration,
  VIBRATION_PATTERNS,
} from '@/features/tools/services/tools-service';

type ToolRowProps = {
  icon: IconName;
  title: string;
  subtitle: string;
  onPress: () => void;
};

function ToolRow({ icon, title, subtitle, onPress }: ToolRowProps) {
  const { colors } = useTheme();

  return (
    <Card onPress={onPress}>
      <View style={styles.row}>
        <View style={[styles.badge, { backgroundColor: withAlpha(colors.accent, 0.12) }]}>
          <Icon name={icon} size={20} color={colors.accent} />
        </View>
        <View style={styles.rowText}>
          <Text style={[styles.rowTitle, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.rowSubtitle, { color: colors.muted }]}>{subtitle}</Text>
        </View>
        <Icon name="chevron-right" size={16} color={colors.muted} />
      </View>
    </Card>
  );
}

/** The Tools tab: clock hand-offs, flashlight, vibration and the screen tests. */
export function ToolsHub() {
  const router = useRouter();
  const { colors } = useTheme();
  const torch = useTorch();
  const [hasVibrator] = useState<boolean | null>(() => {
    const result = readVibrationSupport();
    return result.status === 'ok' ? result.value : false;
  });
  const [notice, setNotice] = useState<string | null>(null);

  // Leaving the hub should not leave a vibration pattern running.
  useEffect(() => () => stopVibration(), []);

  const openAlarms = useCallback(() => {
    setNotice(null);
    showAlarms()
      .then((result) => {
        if (result.status === 'unavailable') setNotice(result.reason);
      })
      .catch(() => setNotice('The clock app could not be opened.'));
  }, []);

  const torchInfo = torch.info?.status === 'ok' ? torch.info.value : null;
  const torchAvailable = torchInfo?.available ?? false;
  const torchOn = torchInfo?.enabled === true;
  const torchSubtitle =
    torch.info == null
      ? 'Reading the flashlight state…'
      : torch.info.status !== 'ok'
        ? 'Not available on this device'
        : !torchAvailable
          ? 'No flashlight on this device'
          : torchInfo?.enabled == null
            ? 'Reading the flashlight state…'
            : torchOn
              ? 'On'
              : 'Off';

  return (
    <Screen scroll contentStyle={styles.content}>
      <SectionHeader title="Clock" />
      <ToolRow
        icon="alarm"
        title="Set alarm"
        subtitle="Prefills an alarm in your clock app"
        onPress={() => router.push('/alarm')}
      />
      <ToolRow
        icon="timer"
        title="Timer"
        subtitle="Prefills a countdown in your clock app"
        onPress={() => router.push('/timer')}
      />
      <ToolRow
        icon="clock"
        title="Show alarms"
        subtitle="Opens the alarm list in your clock app"
        onPress={openAlarms}
      />

      <SectionHeader title="Flashlight & feedback" />
      <Card>
        <View style={styles.row}>
          <View style={[styles.badge, { backgroundColor: withAlpha(colors.accent, 0.12) }]}>
            <Icon name="flashlight" size={20} color={colors.accent} />
          </View>
          <View style={styles.rowText}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>Flashlight</Text>
            <Text style={[styles.rowSubtitle, { color: colors.muted }]}>{torchSubtitle}</Text>
          </View>
          <Switch
            value={torchOn}
            disabled={!torchAvailable || torch.busy}
            onValueChange={torch.toggle}
            trackColor={{ false: colors.surface2, true: withAlpha(colors.accent, 0.5) }}
            thumbColor={torchOn ? colors.accent : colors.muted}
          />
        </View>
        {torch.notice ? (
          <Text style={[styles.notice, { color: colors.warning }]}>{torch.notice}</Text>
        ) : null}
      </Card>

      <Card>
        <View style={styles.row}>
          <View style={[styles.badge, { backgroundColor: withAlpha(colors.accent, 0.12) }]}>
            <Icon name="vibrate" size={20} color={colors.accent} />
          </View>
          <View style={styles.rowText}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>Vibration</Text>
            <Text style={[styles.rowSubtitle, { color: colors.muted }]}>
              {hasVibrator === false
                ? 'Not available on this device'
                : 'Plays a pattern so you can feel the motor'}
            </Text>
          </View>
        </View>
        {hasVibrator ? (
          <View style={styles.patterns}>
            {VIBRATION_PATTERNS.map((pattern) => (
              <Chip
                key={pattern.id}
                label={pattern.label}
                onPress={() => runVibrationPattern(pattern)}
              />
            ))}
          </View>
        ) : null}
      </Card>

      <SectionHeader title="Screen tests" />
      <ToolRow
        icon="pointer"
        title="Touch test"
        subtitle="Light up every zone of the screen"
        onPress={() => router.push('/touch-test')}
      />
      <ToolRow
        icon="palette"
        title="Colour & dead pixels"
        subtitle="Full-screen colours to spot stuck pixels"
        onPress={() => router.push('/screen-test')}
      />

      {notice ? <Text style={[styles.notice, { color: colors.muted }]}>{notice}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: spacing.xs,
  },
  rowTitle: {
    ...typography.body,
    fontFamily: 'Inter_600SemiBold',
  },
  rowSubtitle: {
    ...typography.caption,
  },
  patterns: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  notice: {
    ...typography.caption,
    marginTop: spacing.sm,
  },
});
