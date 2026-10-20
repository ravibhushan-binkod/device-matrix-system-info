import {
  HARDWARE_TEST_IDS,
  type HardwareTestDefinition,
  type HardwareTestGroup,
  type HardwareTestId,
  type HardwareTestResults,
} from '@/features/hardware-tests/types';

const DEFINITIONS: readonly HardwareTestDefinition[] = [
  {
    id: 'display',
    title: 'Display & pixels',
    shortTitle: 'Display',
    icon: 'display',
    group: 'Display & touch',
    instruction:
      'Open the full-screen colours and check for dead or stuck pixels, banding, bright patches and uneven tint.',
    availability: 'ready',
    unavailableReason: null,
    automated: false,
  },
  {
    id: 'multitouch',
    title: 'Multi-touch',
    shortTitle: 'Multi-touch',
    icon: 'pointer',
    group: 'Display & touch',
    instruction:
      'Place several fingers on the pad at the same time. Every touch should appear, move with your finger and disappear when you lift it.',
    availability: 'ready',
    unavailableReason: null,
    automated: false,
  },
  {
    id: 'flashlight',
    title: 'Flashlight',
    shortTitle: 'Flashlight',
    icon: 'flashlight',
    group: 'Display & touch',
    instruction:
      'The flashlight turns on automatically. Check that it lights brightly and turns off again when you leave this screen.',
    availability: 'ready',
    unavailableReason: null,
    automated: true,
  },
  {
    id: 'loudspeaker',
    title: 'Loudspeaker',
    shortTitle: 'Loudspeaker',
    icon: 'speaker',
    group: 'Sound',
    instruction:
      'Play the tone and compare the left and right speakers. Both sides should be clear, without crackle or rattle.',
    availability: 'ready',
    unavailableReason: null,
    automated: false,
  },
  {
    id: 'earpiece',
    title: 'Earpiece',
    shortTitle: 'Earpiece',
    icon: 'earpiece',
    group: 'Sound',
    instruction:
      'Hold the phone to your ear and play the tone. Use the call volume keys if it is too quiet. The tone stops automatically.',
    availability: 'ready',
    unavailableReason: null,
    automated: false,
  },
  {
    id: 'proximity',
    title: 'Proximity sensor',
    shortTitle: 'Proximity',
    icon: 'sensors',
    group: 'Sensors',
    instruction:
      'Cover the top of the phone with your hand, then move it away. The state should switch between Near and Far.',
    availability: 'ready',
    unavailableReason: null,
    automated: true,
  },
  {
    id: 'light',
    title: 'Light sensor',
    shortTitle: 'Light',
    icon: 'sun',
    group: 'Sensors',
    instruction:
      'Cover the light sensor, then shine a light on it. The lux reading should change as the light changes.',
    availability: 'ready',
    unavailableReason: null,
    automated: true,
  },
  {
    id: 'accelerometer',
    title: 'Accelerometer',
    shortTitle: 'Accelerometer',
    icon: 'tilt',
    group: 'Sensors',
    instruction:
      'Tilt the phone in every direction. The bubble should follow smoothly and return to the centre when the phone lies flat.',
    availability: 'ready',
    unavailableReason: null,
    automated: true,
  },
  {
    id: 'charging',
    title: 'Charging',
    shortTitle: 'Charging',
    icon: 'charging',
    group: 'Power & radios',
    instruction:
      'Plug in a charger, then unplug it. The charging state should change both times. This only reads the state — it never changes power settings.',
    availability: 'ready',
    unavailableReason: null,
    automated: true,
  },
  {
    id: 'headset',
    title: 'Headset & USB audio',
    shortTitle: 'Headset',
    icon: 'headphones',
    group: 'Power & radios',
    instruction:
      'Plug in wired headphones or a USB audio device. The test detects the connection through Android’s audio outputs.',
    availability: 'ready',
    unavailableReason: null,
    automated: true,
  },
  {
    id: 'vibration',
    title: 'Vibration',
    shortTitle: 'Vibration',
    icon: 'vibrate',
    group: 'Power & radios',
    instruction:
      'Play the pattern. You should feel a strong, even vibration. It stops when the screen closes or the app goes to the background.',
    availability: 'ready',
    unavailableReason: null,
    automated: false,
  },
  {
    id: 'bluetooth',
    title: 'Bluetooth',
    shortTitle: 'Bluetooth',
    icon: 'bluetooth',
    group: 'Power & radios',
    instruction:
      'Allow the Nearby devices permission, then open Bluetooth settings and turn Bluetooth on. The state should change to On.',
    availability: 'ready',
    unavailableReason: null,
    automated: true,
  },
  {
    id: 'volume',
    title: 'Volume buttons',
    shortTitle: 'Volume buttons',
    icon: 'volume',
    group: 'Optional',
    instruction: 'Volume-key events need a custom activity hook that this build does not include.',
    availability: 'unavailable',
    unavailableReason:
      'Normal Android apps do not receive volume-key events without a custom activity hook. This test is skipped instead of installing that risky change.',
    automated: false,
  },
  {
    id: 'microphone',
    title: 'Microphone',
    shortTitle: 'Microphone',
    icon: 'microphone',
    group: 'Optional',
    instruction: 'This optional microphone check is off in this build.',
    availability: 'off',
    unavailableReason:
      'Microphone testing is off in this build. No microphone permission is requested.',
    automated: false,
  },
  {
    id: 'fingerprint',
    title: 'Fingerprint',
    shortTitle: 'Fingerprint',
    icon: 'fingerprint',
    group: 'Optional',
    instruction: 'This optional fingerprint check is off in this build.',
    availability: 'off',
    unavailableReason:
      'Fingerprint testing is off in this build. It needs a biometrics library that is not installed, so it is skipped for now.',
    automated: false,
  },
];

export const HARDWARE_TESTS: readonly HardwareTestDefinition[] = DEFINITIONS;

const BY_ID = new Map(DEFINITIONS.map((definition) => [definition.id, definition]));

/** Tests that can actually run and be recorded. */
export const RUNNABLE_HARDWARE_TESTS: readonly HardwareTestDefinition[] = DEFINITIONS.filter(
  (definition) => definition.availability === 'ready',
);

export const HARDWARE_TEST_GROUPS: readonly HardwareTestGroup[] = [
  'Display & touch',
  'Sound',
  'Sensors',
  'Power & radios',
  'Optional',
];

export function isHardwareTestId(value: string): value is HardwareTestId {
  return (HARDWARE_TEST_IDS as readonly string[]).includes(value);
}

export function getHardwareTest(id: HardwareTestId): HardwareTestDefinition {
  return BY_ID.get(id) ?? DEFINITIONS[0]!;
}

export function testsInGroup(group: HardwareTestGroup): readonly HardwareTestDefinition[] {
  return DEFINITIONS.filter((definition) => definition.group === group);
}

/** Index of a runnable test, or -1 when it is optional/skipped. */
export function runnableTestIndex(id: HardwareTestId): number {
  return RUNNABLE_HARDWARE_TESTS.findIndex((definition) => definition.id === id);
}

/** The next runnable test after `id`, wrapping to the first at the end. */
export function nextRunnableTest(id: HardwareTestId): HardwareTestId {
  const index = runnableTestIndex(id);
  if (index < 0) return RUNNABLE_HARDWARE_TESTS[0]!.id;
  return RUNNABLE_HARDWARE_TESTS[(index + 1) % RUNNABLE_HARDWARE_TESTS.length]!.id;
}

/**
 * Start of the guided flow: the first test without a pass, or the first test
 * when everything already passes. A failed test is retried before an untested
 * one so fixing a failure is always the next step.
 */
export function firstPendingTest(results: HardwareTestResults): HardwareTestId {
  const failed = RUNNABLE_HARDWARE_TESTS.find(
    (definition) => results[definition.id]?.outcome === 'fail',
  );
  if (failed) return failed.id;
  const untested = RUNNABLE_HARDWARE_TESTS.find(
    (definition) => results[definition.id] === undefined,
  );
  return untested?.id ?? RUNNABLE_HARDWARE_TESTS[0]!.id;
}

/** "3 of 12" — the guided-flow position, or null for optional tests. */
export function runnablePosition(id: HardwareTestId): { position: number; total: number } | null {
  const index = runnableTestIndex(id);
  if (index < 0) return null;
  return { position: index + 1, total: RUNNABLE_HARDWARE_TESTS.length };
}
