import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { PressableScale } from '@/design-system/animations/pressable-scale';
import { Button, Card, Chip, Screen, SectionHeader } from '@/design-system/components';
import { Icon } from '@/design-system/icon';
import { useTheme } from '@/design-system/theme';
import { radius, spacing, typography } from '@/design-system/tokens';
import { formatTimerLength, sendTimerToClock } from '@/features/tools/services/tools-service';

const PRESET_MINUTES = [1, 3, 5, 10, 15, 30, 60] as const;
const MAX_SECONDS = 86_400;

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

/** Timer form: prefills the standard AlarmClock timer intent in the clock app. */
export function TimerFormScreen() {
  const { colors } = useTheme();
  const [totalSeconds, setTotalSeconds] = useState(300);
  const [label, setLabel] = useState('');
  const [notice, setNotice] = useState<Notice | null>(null);

  const shift = (deltaSeconds: number) =>
    setTotalSeconds((current) => Math.min(MAX_SECONDS, Math.max(0, current + deltaSeconds)));

  const openClock = () => {
    const result = sendTimerToClock(totalSeconds, label);
    if (result.status === 'ok') {
      setNotice({
        text: 'Your clock app is open with this timer. Start it there — it runs and rings there.',
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
        <Text style={[styles.time, { color: colors.text }]}>{formatTimerLength(totalSeconds)}</Text>
        <View style={styles.steppers}>
          <Stepper label="Minute" onMinus={() => shift(-60)} onPlus={() => shift(60)} />
          <Stepper label="Second" onMinus={() => shift(-5)} onPlus={() => shift(5)} />
        </View>
      </Card>

      <SectionHeader title="Presets" />
      <Card>
        <View style={styles.presets}>
          {PRESET_MINUTES.map((minutes) => (
            <Chip
              key={minutes}
              label={`${minutes} min`}
              selected={totalSeconds === minutes * 60}
              onPress={() => setTotalSeconds(minutes * 60)}
            />
          ))}
        </View>
      </Card>

      <SectionHeader title="Label" />
      <Card>
        <TextInput
          value={label}
          onChangeText={setLabel}
          placeholder="Timer label (optional)"
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
            Android runs timers in the Clock app. Device Matrix sends the length there — you start
            and cancel it there.
          </Text>
        </View>
      </Card>

      <Button title="Open clock app" icon="timer" onPress={openClock} disabled={totalSeconds < 1} />
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
    width: 44,
    height: 44,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presets: {
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
