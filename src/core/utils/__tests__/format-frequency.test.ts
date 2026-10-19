import { formatFrequencyKhz } from '@/core/utils/format-frequency';

describe('formatFrequencyKhz', () => {
  it('formats GHz with two digits', () => {
    expect(formatFrequencyKhz(2_200_000)).toBe('2.20 GHz');
    expect(formatFrequencyKhz(1_800_000)).toBe('1.80 GHz');
  });

  it('formats MHz below a gigahertz', () => {
    expect(formatFrequencyKhz(300_000)).toBe('300 MHz');
    expect(formatFrequencyKhz(1_000)).toBe('1 MHz');
  });

  it('formats kHz below a megahertz', () => {
    expect(formatFrequencyKhz(500)).toBe('500 kHz');
  });

  it('honours the digits option', () => {
    expect(formatFrequencyKhz(2_200_000, 1)).toBe('2.2 GHz');
  });

  it('returns a dash for invalid input', () => {
    expect(formatFrequencyKhz(0)).toBe('—');
    expect(formatFrequencyKhz(-1)).toBe('—');
    expect(formatFrequencyKhz(Number.NaN)).toBe('—');
  });
});
