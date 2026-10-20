import {
  formatClockTime,
  formatTimerLength,
  isValidAlarmTime,
  normalizeAlarm,
  VIBRATION_PATTERNS,
  WEEK_DAYS,
} from '@/features/tools/services/tools-service';

jest.mock('@/core/native', () => ({
  getTorchInfo: jest.fn(),
  getVibrationInfo: jest.fn(),
  setTorch: jest.fn(),
  startAlarm: jest.fn(),
  startTimer: jest.fn(),
}));

jest.mock('@/core/system-settings', () => ({
  openSystemSettings: jest.fn(),
}));

describe('formatClockTime', () => {
  it('pads to a 24-hour clock', () => {
    expect(formatClockTime(7, 5)).toBe('07:05');
    expect(formatClockTime(23, 59)).toBe('23:59');
    expect(formatClockTime(0, 0)).toBe('00:00');
  });
});

describe('formatTimerLength', () => {
  it('formats mm:ss', () => {
    expect(formatTimerLength(300)).toBe('05:00');
    expect(formatTimerLength(65)).toBe('01:05');
    expect(formatTimerLength(59)).toBe('00:59');
    expect(formatTimerLength(0)).toBe('00:00');
  });
});

describe('isValidAlarmTime', () => {
  it('accepts real times only', () => {
    expect(isValidAlarmTime(0, 0)).toBe(true);
    expect(isValidAlarmTime(23, 59)).toBe(true);
    expect(isValidAlarmTime(24, 0)).toBe(false);
    expect(isValidAlarmTime(-1, 0)).toBe(false);
    expect(isValidAlarmTime(7, 60)).toBe(false);
    expect(isValidAlarmTime(7.5, 0)).toBe(false);
  });
});

describe('normalizeAlarm', () => {
  it('trims the label, drops unknown days and keeps Calendar order', () => {
    const alarm = normalizeAlarm({
      hour: 6,
      minute: 45,
      label: '  Morning run  ',
      days: [7, 3, 3, 99],
    });
    expect(alarm).toEqual({ hour: 6, minute: 45, label: 'Morning run', days: [3, 7] });
  });

  it('turns an invalid time into null', () => {
    expect(normalizeAlarm({ hour: 25, minute: 0, label: '', days: [] })).toBeNull();
  });
});

describe('vibration and day configuration', () => {
  it('keeps the seven Calendar day codes in order', () => {
    expect(WEEK_DAYS.map((day) => day.code)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('has valid vibration patterns', () => {
    expect(VIBRATION_PATTERNS.length).toBeGreaterThanOrEqual(3);
    for (const pattern of VIBRATION_PATTERNS) {
      expect(pattern.pattern.length).toBeGreaterThanOrEqual(2);
      expect(pattern.pattern[0]).toBe(0);
      for (const step of pattern.pattern) {
        expect(step).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
