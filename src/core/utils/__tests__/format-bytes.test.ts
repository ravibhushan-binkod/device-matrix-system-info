import { bytesToGigabytes, formatBytes, formatByteSize } from '@/core/utils/format-bytes';

describe('bytesToGigabytes', () => {
  it('uses 1024 by default', () => {
    expect(bytesToGigabytes(1024 ** 3)).toBe(1);
  });

  it('uses 1000 in decimal style', () => {
    expect(bytesToGigabytes(1_000_000_000, 'decimal')).toBe(1);
  });
});

describe('formatBytes', () => {
  it('formats GiB with one digit by default', () => {
    expect(formatBytes(8 * 1024 ** 3)).toBe('8.0 GiB');
  });

  it('formats GB in decimal style', () => {
    expect(formatBytes(8_000_000_000, { style: 'decimal' })).toBe('8.0 GB');
  });

  it('honours digits and withUnit', () => {
    expect(formatBytes(1024 ** 3, { digits: 0 })).toBe('1 GiB');
    expect(formatBytes(1.25 * 1024 ** 3, { digits: 2 })).toBe('1.25 GiB');
    expect(formatBytes(8 * 1024 ** 3, { withUnit: false })).toBe('8.0');
  });

  it('returns a dash for non-finite input', () => {
    expect(formatBytes(Number.NaN)).toBe('—');
    expect(formatBytes(Number.POSITIVE_INFINITY)).toBe('—');
  });

  it('formats zero', () => {
    expect(formatBytes(0)).toBe('0.0 GiB');
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
