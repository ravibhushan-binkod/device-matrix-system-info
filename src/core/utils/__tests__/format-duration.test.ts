import { formatUptime } from '@/core/utils/format-duration';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('formatUptime', () => {
  it('formats days, hours and minutes', () => {
    expect(formatUptime(15 * DAY + 14 * HOUR + 26 * MINUTE + 42_000)).toBe('15d 14h 26m');
  });

  it('drops empty leading units', () => {
    expect(formatUptime(3 * HOUR + 5 * MINUTE)).toBe('3h 5m');
    expect(formatUptime(42 * MINUTE + 30_000)).toBe('42m');
  });

  it('reports less than a minute', () => {
    expect(formatUptime(0)).toBe('<1m');
    expect(formatUptime(MINUTE - 1)).toBe('<1m');
  });

  it('handles exact boundaries', () => {
    expect(formatUptime(MINUTE)).toBe('1m');
    expect(formatUptime(HOUR)).toBe('1h 0m');
    expect(formatUptime(DAY - 1)).toBe('23h 59m');
    expect(formatUptime(DAY)).toBe('1d 0h 0m');
  });

  it('returns a dash for invalid input', () => {
    expect(formatUptime(Number.NaN)).toBe('—');
    expect(formatUptime(Number.POSITIVE_INFINITY)).toBe('—');
    expect(formatUptime(-1)).toBe('—');
  });
});
