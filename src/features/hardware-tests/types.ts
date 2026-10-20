import type { IconName } from '@/design-system/icon';

/** Every guided check in the hardware checkup, in display order. */
export const HARDWARE_TEST_IDS = [
  'display',
  'multitouch',
  'flashlight',
  'loudspeaker',
  'earpiece',
  'proximity',
  'light',
  'accelerometer',
  'charging',
  'headset',
  'vibration',
  'bluetooth',
  'volume',
  'microphone',
  'fingerprint',
] as const;

export type HardwareTestId = (typeof HARDWARE_TEST_IDS)[number];

export type HardwareTestOutcome = 'pass' | 'fail';

export type HardwareTestGroup =
  'Display & touch' | 'Sound' | 'Sensors' | 'Power & radios' | 'Optional';

/**
 * `ready`   the test runs and can be recorded
 * `off`     the feature flag is off — no permission or dependency is installed
 * `unavailable` Android does not give normal apps a safe way to run it
 */
export type HardwareTestAvailability = 'ready' | 'off' | 'unavailable';

export type HardwareTestDefinition = {
  id: HardwareTestId;
  title: string;
  /** Short label for compact rows. */
  shortTitle: string;
  icon: IconName;
  group: HardwareTestGroup;
  instruction: string;
  availability: HardwareTestAvailability;
  /** Why the test cannot run; shown instead of Pass/Fail. */
  unavailableReason: string | null;
  /** True when Android reports the result live (the user still confirms it). */
  automated: boolean;
};

export type StoredTestResult = {
  outcome: HardwareTestOutcome;
  /** Epoch milliseconds of the last pass/fail. */
  testedAt: number;
};

export type HardwareTestResults = Partial<Record<HardwareTestId, StoredTestResult>>;

export type HardwareTestStatus = 'pass' | 'fail' | 'untested';
