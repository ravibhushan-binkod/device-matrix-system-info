import { bytesToGigabytes, formatBytes, formatByteSize } from '@/core/utils/format-bytes';

describe('bytesToGigabytes', () => {
  it('uses 1000 steps for the default decimal unit', () => {
    expect(bytesToGigabytes(1_000_000_000)).toBe(1);
  });

  it('uses 1024 steps in binary style', () => {
    expect(bytesToGigabytes(1024 ** 3, 'binary')).toBe(1);
  });
});

describe('formatBytes', () => {
  it('auto-scales decimal GB by default', () => {
    expect(formatBytes(8_000_000_000)).toBe('8.0 GB');
    expect(formatBytes(8 * 1000 ** 3, { digits: 0 })).toBe('8 GB');
  });

  it('supports binary GiB explicitly', () => {
    expect(formatBytes(8 * 1024 ** 3, { style: 'binary' })).toBe('8.0 GiB');
    expect(formatBytes(1.25 * 1024 ** 3, { style: 'binary', digits: 2 })).toBe('1.25 GiB');
  });

  it('honours withUnit', () => {
    expect(formatBytes(8_000_000_000, { withUnit: false })).toBe('8.0');
  });

  it('returns a dash for non-finite input', () => {
    expect(formatBytes(Number.NaN)).toBe('—');
    expect(formatBytes(Number.POSITIVE_INFINITY)).toBe('—');
  });

  it('formats zero', () => {
    expect(formatBytes(0)).toBe('0 B');
  });
});

describe('formatByteSize', () => {
  it('scales to the right unit in decimal steps by default', () => {
    expect(formatByteSize(0)).toBe('0 B');
    expect(formatByteSize(999)).toBe('999 B');
    expect(formatByteSize(1_000)).toBe('1.0 KB');
    expect(formatByteSize(12_400_000)).toBe('12.4 MB');
    expect(formatByteSize(3_900_000_000)).toBe('3.9 GB');
    expect(formatByteSize(2_500_000_000_000)).toBe('2.5 TB');
  });

  it('supports binary steps', () => {
    expect(formatByteSize(1024, { style: 'binary' })).toBe('1.0 KiB');
    expect(formatByteSize(1024 ** 3, { style: 'binary' })).toBe('1.0 GiB');
  });

  it('honours digits and sign', () => {
    expect(formatByteSize(1_234_567, { digits: 2 })).toBe('1.23 MB');
    expect(formatByteSize(-2_500)).toBe('-2.5 KB');
  });

  it('returns a dash for non-finite input', () => {
    expect(formatByteSize(Number.NaN)).toBe('—');
    expect(formatByteSize(Number.NEGATIVE_INFINITY)).toBe('—');
  });
});
