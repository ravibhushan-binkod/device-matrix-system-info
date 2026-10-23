import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import {
  addSoundLevelListener,
  startSoundLevel,
  stopSoundLevel,
  type SoundLevelReading,
} from '@/core/native';
import { MICROPHONE_PERMISSION, openAppSettings, usePermission } from '@/core/permissions';
import { failureMessage } from '@/core/result';
import {
  Button,
  Card,
  PermissionBanner,
  PermissionRationaleSheet,
} from '@/design-system/components';
import { withAlpha } from '@/design-system/color';
import { Icon } from '@/design-system/icon';
import { useTheme } from '@/design-system/theme';
import { radius, spacing, typography } from '@/design-system/tokens';

type Props = { onUnavailable: (reason: string | null) => void };

const EMPTY_READING: SoundLevelReading = { level: 0, db: -60, peak: 0 };

/**
 * Microphone check: a live, in-memory level meter. The rationale is shown
 * before Android's dialog, and the recorder is stopped on blur, on background
 * and on unmount. No audio is ever written to disk or sent over the network.
 */
export function MicrophoneTest({ onUnavailable }: Props) {
  const { colors } = useTheme();
  const permission = usePermission(MICROPHONE_PERMISSION);
  const [started, setStarted] = useState(false);
  const [denied, setDenied] = useState(false);
  const [running, setRunning] = useState(false);
  const [reading, setReading] = useState<SoundLevelReading>(EMPTY_READING);
  const [failure, setFailure] = useState<string | null>(null);
  const [rationale, setRationale] = useState(false);
  const removeListenerRef = useRef<(() => void) | null>(null);

  const stopMeter = useCallback(() => {
    removeListenerRef.current?.();
    removeListenerRef.current = null;
    stopSoundLevel();
    setRunning(false);
  }, []);

  const startMeter = useCallback(() => {
    const result = startSoundLevel();
    if (result.status !== 'ok') {
      setFailure(failureMessage(result));
      setRunning(false);
      return;
    }
    removeListenerRef.current?.();
    removeListenerRef.current = addSoundLevelListener(setReading);
    setFailure(null);
    setRunning(true);
  }, []);

  useEffect(() => {
    if (!started) {
      onUnavailable(null);
      return;
    }
    if (!permission.granted) {
      onUnavailable(
        denied
          ? 'Microphone access is denied. Allow it in system Settings, then return here.'
          : null,
      );
      return;
    }
    onUnavailable(failure);
  }, [denied, failure, onUnavailable, permission.granted, started]);

  // The meter must never keep the microphone open when this screen is not in
  // front of the user.
  useFocusEffect(
    useCallback(
      () => () => {
        stopMeter();
      },
      [stopMeter],
    ),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') stopMeter();
    });
    return () => subscription.remove();
  }, [stopMeter]);

  useEffect(
    () => () => {
      removeListenerRef.current?.();
      stopSoundLevel();
    },
    [],
  );

  const start = () => {
    setStarted(true);
    setFailure(null);
    setDenied(false);
    setReading(EMPTY_READING);
    if (permission.granted) {
      startMeter();
      return;
    }
    if (permission.canAskAgain) {
      setRationale(true);
      return;
    }
    setDenied(true);
  };

  const allow = async () => {
    setRationale(false);
    const state = await permission.request();
    if (state === 'granted') {
      setDenied(false);
      startMeter();
    } else {
      setDenied(true);
    }
  };

  const percent = Math.round(reading.level * 100);
  const db = Math.round(reading.db);

  return (
    <>
      <Card style={styles.card}>
        <View style={styles.stage}>
          <View style={[styles.micCircle, { backgroundColor: withAlpha(colors.accent, 0.12) }]}>
            <Icon name="microphone" size={48} color={colors.accent} />
          </View>
        </View>

        <View
          style={[styles.meter, { backgroundColor: colors.surface2 }]}
          accessibilityElementsHidden
        >
          <View
            style={[
              styles.meterFill,
              {
                width: `${running ? Math.max(2, percent) : 0}%`,
                backgroundColor: colors.accent,
              },
            ]}
          />
        </View>
        <View style={styles.readingRow}>
          <Text style={[styles.reading, { color: colors.text }]}>
            {running ? (percent > 8 ? 'Sound detected' : 'Listening…') : 'Meter stopped'}
          </Text>
          <Text style={[styles.db, { color: colors.muted }]}>{running ? `${db} dBFS` : '—'}</Text>
        </View>

        <Button
          title={running ? 'Stop microphone check' : 'Start microphone check'}
          icon={running ? 'pause' : 'microphone'}
          onPress={running ? stopMeter : start}
        />

        {started && !permission.granted ? (
          <PermissionBanner
            title="Microphone access is off"
            message="The microphone check cannot run without access. Android calls this permission Microphone."
            icon="microphone"
            actionLabel="Open settings"
            onAction={() => void openAppSettings()}
          />
        ) : null}

        {failure ? <Text style={[styles.notice, { color: colors.warning }]}>{failure}</Text> : null}

        <Text style={[styles.note, { color: colors.muted }]}>
          Only live levels are measured. No audio is recorded, saved or sent. The microphone is
          released as soon as you leave this screen or the app goes to the background.
        </Text>
      </Card>

      <PermissionRationaleSheet
        visible={rationale}
        title="Allow microphone access?"
        message="The check reads live sound levels from the microphone so you can see that it works. It never records, stores or sends audio."
        footer="Android will now ask for the Microphone permission. You can stop the check at any time."
        allowLabel="Continue"
        onAllow={() => void allow()}
        onCancel={() => {
          setRationale(false);
          setDenied(true);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  stage: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meter: {
    height: 12,
    borderRadius: radius.chip,
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    borderRadius: radius.chip,
  },
  readingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  reading: {
    ...typography.body,
    fontFamily: 'Inter_600SemiBold',
  },
  db: {
    ...typography.mono,
  },
  note: {
    ...typography.caption,
    lineHeight: 18,
  },
  notice: {
    ...typography.caption,
    lineHeight: 18,
  },
});
