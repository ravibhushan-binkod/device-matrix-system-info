import {
  HARDWARE_TESTS,
  RUNNABLE_HARDWARE_TESTS,
  firstPendingTest,
  getHardwareTest,
  isHardwareTestId,
  nextRunnableTest,
  runnablePosition,
  runnableTestIndex,
  testsInGroup,
} from '@/features/hardware-tests/services/test-catalog';
import { HARDWARE_TEST_IDS } from '@/features/hardware-tests/types';

describe('hardware test catalog', () => {
  it('has one definition per id and no duplicates', () => {
    expect(HARDWARE_TESTS).toHaveLength(HARDWARE_TEST_IDS.length);
    expect(new Set(HARDWARE_TESTS.map((test) => test.id)).size).toBe(HARDWARE_TESTS.length);
    expect(isHardwareTestId('display')).toBe(true);
    expect(isHardwareTestId('not-a-test')).toBe(false);
    expect(isHardwareTestId('fingerprint')).toBe(false);
    expect(getHardwareTest('earpiece').title).toBe('Earpiece');
  });

  it('includes volume buttons and the microphone in the runnable flow', () => {
    const ids = RUNNABLE_HARDWARE_TESTS.map((test) => test.id);
    expect(ids).toContain('volume');
    expect(ids).toContain('microphone');
    expect(ids).not.toContain('fingerprint');
    expect(ids).toHaveLength(14);
    expect(getHardwareTest('microphone').availability).toBe('ready');
    expect(getHardwareTest('volume').availability).toBe('ready');
  });

  it('can navigate the runnable flow and wrap at the end', () => {
    expect(runnableTestIndex('display')).toBe(0);
    expect(runnableTestIndex('microphone')).toBe(13);
    expect(runnablePosition('display')).toEqual({ position: 1, total: 14 });
    expect(nextRunnableTest('display')).toBe('multitouch');
    expect(nextRunnableTest('bluetooth')).toBe('volume');
    expect(nextRunnableTest('volume')).toBe('microphone');
    expect(nextRunnableTest('microphone')).toBe('display');
  });

  it('starts a checkup at a failure, then an untested test', () => {
    expect(firstPendingTest({})).toBe('display');
    expect(firstPendingTest({ display: { outcome: 'pass', testedAt: 1 } })).toBe('multitouch');
    expect(
      firstPendingTest({
        display: { outcome: 'pass', testedAt: 1 },
        multitouch: { outcome: 'fail', testedAt: 2 },
      }),
    ).toBe('multitouch');
  });

  it('groups tests without losing any', () => {
    const grouped = [
      ...testsInGroup('Display & touch'),
      ...testsInGroup('Sound'),
      ...testsInGroup('Sensors'),
      ...testsInGroup('Power & radios'),
    ];
    expect(grouped).toHaveLength(HARDWARE_TESTS.length);
  });
});
