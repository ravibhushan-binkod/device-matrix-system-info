import { getString, setString } from '@/core/storage/mmkv';
import {
  HARDWARE_RESULTS_KEY,
  buildChecklistText,
  clearTestResult,
  formatTestDate,
  parseResults,
  readTestResults,
  recordTestResult,
  reportLine,
  serializeResults,
  summarizeResults,
  testStatus,
} from '@/features/hardware-tests/services/results-service';

jest.mock('@/core/storage/mmkv', () => ({
  getString: jest.fn(),
  setString: jest.fn(),
}));

const getStringMock = getString as jest.MockedFunction<typeof getString>;
const setStringMock = setString as jest.MockedFunction<typeof setString>;
const NOW = new Date(2026, 9, 20, 15, 4);

beforeEach(() => {
  jest.clearAllMocks();
  getStringMock.mockReturnValue(undefined);
});

describe('parseResults', () => {
  it('returns an empty object for missing or broken data', () => {
    expect(parseResults(undefined)).toEqual({});
    expect(parseResults('')).toEqual({});
    expect(parseResults('{not json')).toEqual({});
    expect(parseResults('[]')).toEqual({});
    expect(parseResults('null')).toEqual({});
  });

  it('keeps valid ids and drops unknown or malformed entries', () => {
    const parsed = parseResults(
      JSON.stringify({
        display: { outcome: 'pass', testedAt: 1_700_000_000_000 },
        loudspeaker: { outcome: 'maybe', testedAt: 1_700_000_000_000 },
        'not-a-test': { outcome: 'fail', testedAt: 1_700_000_000_000 },
        proximity: { outcome: 'fail', testedAt: -1 },
        earpiece: { outcome: 'fail', testedAt: 42 },
      }),
    );
    expect(Object.keys(parsed).sort()).toEqual(['display', 'earpiece']);
    expect(parsed.display?.outcome).toBe('pass');
  });
});

describe('stored results', () => {
  it('records a result under one MMKV key', () => {
    getStringMock.mockReturnValue(
      JSON.stringify({ display: { outcome: 'pass', testedAt: 1_000 } }),
    );
    const next = recordTestResult('display', 'fail', 2_000);
    expect(next.display).toEqual({ outcome: 'fail', testedAt: 2_000 });
    expect(setStringMock).toHaveBeenCalledWith(HARDWARE_RESULTS_KEY, serializeResults(next));
  });

  it('clears a result back to untested', () => {
    getStringMock.mockReturnValue(
      JSON.stringify({ display: { outcome: 'pass', testedAt: 1_000 } }),
    );
    expect(clearTestResult('display')).toEqual({});
    expect(setStringMock).toHaveBeenCalledWith(HARDWARE_RESULTS_KEY, '{}');
  });

  it('reads through the storage wrapper', () => {
    getStringMock.mockReturnValue(JSON.stringify({ light: { outcome: 'fail', testedAt: 1_000 } }));
    expect(readTestResults().light?.outcome).toBe('fail');
    expect(getStringMock).toHaveBeenCalledWith(HARDWARE_RESULTS_KEY);
  });
});

describe('summary and status', () => {
  it('counts only runnable tests', () => {
    const summary = summarizeResults({
      display: { outcome: 'pass', testedAt: 1 },
      loudspeaker: { outcome: 'fail', testedAt: 1 },
      microphone: { outcome: 'pass', testedAt: 1 },
    });
    expect(summary).toEqual({
      total: 12,
      passed: 1,
      failed: 1,
      untested: 10,
      percent: 17,
    });
    expect(testStatus({ display: { outcome: 'pass', testedAt: 1 } }, 'display')).toBe('pass');
    expect(testStatus({}, 'display')).toBe('untested');
  });
});

describe('dates and text', () => {
  it('formats today, yesterday and older dates', () => {
    expect(formatTestDate(new Date(2026, 9, 20, 14, 3).getTime(), NOW)).toBe('Today, 14:03');
    expect(formatTestDate(new Date(2026, 9, 19, 9, 12).getTime(), NOW)).toBe('Yesterday, 09:12');
    expect(formatTestDate(new Date(2026, 9, 18, 9, 12).getTime(), NOW)).toBe('18 Oct 2026');
    expect(formatTestDate(Number.NaN, NOW)).toBe('Unknown date');
  });

  it('builds a shareable checklist with pass, fail and optional states', () => {
    const text = buildChecklistText(
      {
        display: { outcome: 'pass', testedAt: new Date(2026, 9, 20, 14, 3).getTime() },
        loudspeaker: { outcome: 'fail', testedAt: new Date(2026, 9, 19, 9, 12).getTime() },
      },
      NOW,
    );
    expect(text).toContain('Used-phone hardware checklist');
    expect(text).toContain('[x] Display & pixels — Passed (Today, 14:03)');
    expect(text).toContain('[!] Loudspeaker — Failed (Yesterday, 09:12)');
    expect(text).toContain('[ ] Multi-touch — Untested');
    expect(text).toContain('[ ] Microphone — Off in this build');
    expect(text).toContain('[ ] Volume buttons — Skipped on this device');
  });

  it('gives the report an honest line for each state', () => {
    const results = {
      display: { outcome: 'pass' as const, testedAt: new Date(2026, 9, 20, 14, 3).getTime() },
    };
    expect(reportLine(results, 'display', NOW)).toBe('Passed · Today, 14:03');
    expect(reportLine(results, 'light', NOW)).toBe('Untested');
    expect(reportLine(results, 'microphone', NOW)).toBe('Off in this build');
    expect(reportLine(results, 'volume', NOW)).toBe('Skipped on this device');
  });
});
