export type ByteStyle = 'binary' | 'decimal';

const FACTORS: Record<ByteStyle, number> = {
  binary: 1024 ** 3,
  decimal: 1000 ** 3,
};

const UNITS: Record<ByteStyle, string> = {
  binary: 'GiB',
  decimal: 'GB',
};

/** Bytes → GiB (binary) or GB (decimal). */
export function bytesToGigabytes(bytes: number, style: ByteStyle = 'binary'): number {
  return bytes / FACTORS[style];
}

export type FormatBytesOptions = {
  /** `binary` = GiB (default), `decimal` = GB. */
  style?: ByteStyle;
  /** Fraction digits (default 1). */
  digits?: number;
  /** Append the unit (default true). */
  withUnit?: boolean;
};

/** Formats a byte count as GB or GiB, e.g. `8 * 1024 ** 3` → "8.0 GiB". */
export function formatBytes(bytes: number, options: FormatBytesOptions = {}): string {
  const { style = 'binary', digits = 1, withUnit = true } = options;
  if (!Number.isFinite(bytes)) return '—';
  const text = bytesToGigabytes(bytes, style).toFixed(digits);
  return withUnit ? `${text} ${UNITS[style]}` : text;
}

const SIZE_UNITS: Record<ByteStyle, readonly string[]> = {
  binary: ['B', 'KiB', 'MiB', 'GiB', 'TiB'],
  decimal: ['B', 'KB', 'MB', 'GB', 'TB'],
};

export type FormatByteSizeOptions = {
  /** `decimal` (1000 steps, default) or `binary` (1024 steps). */
  style?: ByteStyle;
  /** Fraction digits from KB/MB/GB upwards (default 1; bytes are whole). */
  digits?: number;
};

/** Auto-scaled byte count, e.g. `12_400_000` → "12.4 MB" and `3.9e9` → "3.9 GB". */
export function formatByteSize(bytes: number, options: FormatByteSizeOptions = {}): string {
  const { style = 'decimal', digits = 1 } = options;
  if (!Number.isFinite(bytes)) return '—';

  const base = style === 'binary' ? 1024 : 1000;
  const units = SIZE_UNITS[style];
  const sign = bytes < 0 ? '-' : '';
  let value = Math.abs(bytes);
  let unitIndex = 0;
  while (value >= base && unitIndex < units.length - 1) {
    value /= base;
    unitIndex += 1;
  }

  const text = unitIndex === 0 ? `${Math.round(value)}` : value.toFixed(digits);
  return `${sign}${text} ${units[unitIndex]}`;
}
