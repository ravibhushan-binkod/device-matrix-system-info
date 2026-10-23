import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { PressableScale } from '@/design-system/animations/pressable-scale';
import { Button, Card, Chip, Screen, SectionHeader } from '@/design-system/components';
import { Icon } from '@/design-system/icon';
import { useTheme } from '@/design-system/theme';
import { radius, spacing, typography } from '@/design-system/tokens';
import {
  formatClockTime,
  sendAlarmToClock,
  WEEK_DAYS,
} from '@/features/tools/services/tools-service';

type Notice = { text: string; error: boolean };

function Stepper({
  label,
  onMinus,
  onPlus,
}: {
  label: string;
  onMinus: () => void;
  onPlus: () => void;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.stepper}>
      <Text style={[styles.stepperLabel, { color: colors.muted }]}>{label}</Text>
      <View style={styles.stepperButtons}>
        <PressableScale
          onPress={onMinus}
          accessibilityRole="button"
          style={[styles.stepButton, { backgroundColor: colors.surface2 }]}
        >
          <Icon name="minus" size={20} color={colors.text} />
        </PressableScale>
        <PressableScale
          onPress={onPlus}
          accessibilityRole="button"
          style={[styles.stepButton, { backgroundColor: colors.surface2 }]}
        >
          <Icon name="plus" size={20} color={colors.text} />
        </PressableScale>
      </View>
    </View>
  );
}

/** Set-alarm form: prefills the standard AlarmClock intent and hands over to the clock app. */
export function AlarmFormScreen() {
  const { colors } = useTheme();
  const [hour, setHour] = useState(() => (new Date().getHours() + 1) % 24);
  const [minute, setMinute] = useState(0);
  const [days, setDays] = useState<number[]>([]);
  const [label, setLabel] = useState('');
  const [notice, setNotice] = useState<Notice | null>(null);

  const shiftHour = (delta: number) => setHour((current) => (current + delta + 24) % 24);
  const shiftMinute = (delta: number) => setMinute((current) => (current + delta + 60) % 60);
  const toggleDay = (code: number) =>
    setDays((current) =>
      current.includes(code) ? current.filter((day) => day !== code) : [...current, code],
    );

  const dayNames = days
    .slice()
    .sort((a, b) => a - b)
    .map((code) => WEEK_DAYS.find((day) => day.code === code)?.name)
    .filter((name): name is string => name != null);
  const repeatHint =
    dayNames.length === 0
      ? 'No repeat — a one-time alarm.'
      : dayNames.length === WEEK_DAYS.length
        ? 'Repeats every day.'
        : `Repeats on ${dayNames.join(', ')}.`;

  const openClock = () => {
    const result = sendAlarmToClock({ hour, minute, label, days });
    if (result.status === 'ok') {
      setNotice({
        text: 'Your clock app is open with these details. Save the alarm there to keep it.',
        error: false,
      });
    } else if (result.status === 'unavailable') {
      setNotice({ text: result.reason, error: true });
    } else {
      setNotice({ text: 'Permission denied', error: true });
    }
  };

  return (
    <Screen scroll contentStyle={styles.content}>
      <Card style={styles.hero}>
        <Text style={[styles.time, { color: colors.text }]}>{formatClockTime(hour, minute)}</Text>
        <View style={styles.steppers}>
          <Stepper label="Hour" onMinus={() => shiftHour(-1)} onPlus={() => shiftHour(1)} />
          <Stepper label="Minute" onMinus={() => shiftMinute(-5)} onPlus={() => shiftMinute(5)} />
        </View>
      </Card>

      <SectionHeader title="Repeat" />
      <Card>
        <View style={styles.days}>
          {WEEK_DAYS.map((day) => (
            <Chip
              key={day.code}
              label={day.letter}
              selected={days.includes(day.code)}
              onPress={() => toggleDay(day.code)}
            />
          ))}
        </View>
        <Text style={[styles.hint, { color: colors.muted }]}>{repeatHint}</Text>
      </Card>

      <SectionHeader title="Label" />
      <Card>
        <TextInput
          value={label}
          onChangeText={setLabel}
          placeholder="Alarm label"
          placeholderTextColor={colors.muted}
          maxLength={60}
          style={[
            styles.input,
            {
              color: colors.text,
              backgroundColor: colors.surface2,
              borderColor: colors.border,
            },
          ]}
        />
      </Card>

      <Card>
        <View style={styles.noteRow}>
          <Icon name="info" size={20} color={colors.muted} />
          <Text style={[styles.hint, { color: colors.muted }]}>
            Android keeps alarms in the Clock app. Device Matrix sends these details there — you
            save it there and can edit or delete it there later.
          </Text>
        </View>
      </Card>

      <Button title="Open clock app" icon="alarm" onPress={openClock} />
      {notice ? (
        <Text style={[styles.hint, { color: notice.error ? colors.warning : colors.muted }]}>
          {notice.text}
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  hero: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  time: {
    ...typography.display,
  },
  steppers: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  stepper: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  stepperLabel: {
    ...typography.caption,
  },
  stepperButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  stepButton: {
    width: 48,
    height: 48,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  days: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  hint: {
    ...typography.caption,
    marginTop: spacing.sm,
  },
  input: {
    ...typography.body,
    minHeight: 48,
    textAlignVertical: 'center',
    borderRadius: radius.button,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
});
