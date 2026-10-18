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
