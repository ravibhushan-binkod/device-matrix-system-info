import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { EmptyState, Screen } from '@/design-system/components';
import { useHardwareResults } from '@/features/hardware-tests/hooks/use-hardware-results';
import {
  AccelerometerTest,
  LightTest,
  ProximityTest,
} from '@/features/hardware-tests/components/sensor-tests';
import { DisplayTest, MultitouchTest } from '@/features/hardware-tests/components/display-tests';
import { EarpieceTest, LoudspeakerTest } from '@/features/hardware-tests/components/audio-tests';
import {
  BluetoothTest,
  ChargingTest,
  HeadsetTest,
} from '@/features/hardware-tests/components/connection-tests';
import { TestShell } from '@/features/hardware-tests/components/test-shell';
import { TorchTest, VibrationTest } from '@/features/hardware-tests/components/physical-tests';
import { UnavailableTest } from '@/features/hardware-tests/components/unavailable-test';
import {
  RUNNABLE_HARDWARE_TESTS,
  getHardwareTest,
  isHardwareTestId,
  runnablePosition,
} from '@/features/hardware-tests/services/test-catalog';
import type { HardwareTestId, HardwareTestOutcome } from '@/features/hardware-tests/types';

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * One guided check. The same screen is used for a single visit and for the
 * "Run all tests" flow; in the flow, recording a result advances to the next
 * runnable test and the last one returns to the overview.
 */
export function HardwareTestDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ test?: string | string[]; flow?: string | string[] }>();
  const rawId = firstParam(params.test);
  const id: HardwareTestId | null = rawId && isHardwareTestId(rawId) ? rawId : null;
  const flow = firstParam(params.flow) === '1';
  const definition = id ? getHardwareTest(id) : null;
  const { results, record, clear } = useHardwareResults();
  const [runtime, setRuntime] = useState<{ id: HardwareTestId | null; reason: string | null }>({
    id,
    reason: null,
  });
  const runtimeUnavailable = runtime.id === id ? runtime.reason : null;
  const [testKey, setTestKey] = useState(0);
  const navigationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idRef = useRef(id);

  useEffect(() => {
    idRef.current = id;
  }, [id]);

  const handleUnavailable = useCallback((reason: string | null) => {
    setRuntime({ id: idRef.current, reason });
  }, []);

  useEffect(
    () => () => {
      if (navigationTimer.current) clearTimeout(navigationTimer.current);
    },
    [],
  );

  const position = definition ? runnablePosition(definition.id) : null;
  const flowPosition = flow && position ? position : null;

  const advance = useCallback(() => {
    if (!definition) return;
    if (!position) {
      router.replace('/hardware-tests');
      return;
    }
    const next = RUNNABLE_HARDWARE_TESTS[position.position];
    if (next) {
      router.replace({
        pathname: '/hardware-tests/[test]',
        params: { test: next.id, flow: '1' },
      });
    } else {
      router.replace('/hardware-tests');
    }
  }, [definition, position, router]);

  const scheduleAdvance = useCallback(() => {
    if (!flow) return;
    if (navigationTimer.current) clearTimeout(navigationTimer.current);
    navigationTimer.current = setTimeout(advance, 650);
  }, [advance, flow]);

  const finish = useCallback(
    (outcome: HardwareTestOutcome) => {
      if (!id || !definition || definition.availability !== 'ready' || runtimeUnavailable) return;
      record(id, outcome);
      void Haptics.notificationAsync(
        outcome === 'pass'
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Error,
      ).catch(() => undefined);
      scheduleAdvance();
    },
    [definition, id, record, runtimeUnavailable, scheduleAdvance],
  );

  const retest = () => {
    if (!id) return;
    clear(id);
    setRuntime({ id, reason: null });
    setTestKey((key) => key + 1);
    void Haptics.selectionAsync().catch(() => undefined);
  };

  if (!definition) {
    return (
      <Screen>
        <EmptyState
          icon="wrench"
          title="Test not found"
          message="That hardware test does not exist in this build."
        />
      </Screen>
    );
  }

  const content = (() => {
    switch (definition.id) {
      case 'display':
        return <DisplayTest />;
      case 'multitouch':
        return <MultitouchTest />;
      case 'flashlight':
        return <TorchTest onUnavailable={handleUnavailable} />;
      case 'loudspeaker':
        return <LoudspeakerTest onUnavailable={handleUnavailable} />;
      case 'earpiece':
        return <EarpieceTest onUnavailable={handleUnavailable} />;
      case 'proximity':
        return <ProximityTest onUnavailable={handleUnavailable} />;
      case 'light':
        return <LightTest onUnavailable={handleUnavailable} />;
      case 'accelerometer':
        return <AccelerometerTest onUnavailable={handleUnavailable} />;
      case 'charging':
        return <ChargingTest onUnavailable={handleUnavailable} />;
      case 'headset':
        return <HeadsetTest onUnavailable={handleUnavailable} />;
      case 'vibration':
        return <VibrationTest onUnavailable={handleUnavailable} />;
      case 'bluetooth':
        return <BluetoothTest onUnavailable={handleUnavailable} />;
      case 'volume':
      case 'microphone':
      case 'fingerprint':
        return <UnavailableTest definition={definition} />;
      default:
        return null;
    }
  })();

  return (
    <>
      <Stack.Screen options={{ title: definition.shortTitle }} />
      <TestShell
        key={`${definition.id}-${testKey}`}
        definition={definition}
        results={results}
        flow={flowPosition}
        runtimeUnavailable={runtimeUnavailable}
        onPass={() => finish('pass')}
        onFail={() => finish('fail')}
        onRetest={retest}
        onSkip={flow ? advance : undefined}
      >
        {content}
      </TestShell>
    </>
  );
}
