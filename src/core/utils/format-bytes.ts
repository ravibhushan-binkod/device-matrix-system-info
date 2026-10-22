import { getActiveUnits } from '@/core/units/active';
import {
  bytesToGigabytes as bytesToGigabytesIn,
  formatByteSize as formatByteSizeIn,
  type ByteStyle,
} from '@/core/units/format';

export type { ByteStyle };

/** Bytes → GiB (binary) or GB (decimal) in the active storage unit. */
export function bytesToGigabytes(
  bytes: number,
  style: ByteStyle = getActiveUnits().storage,
): number {
  return bytesToGigabytesIn(bytes, style);
}

export type FormatBytesOptions = {
  /** `binary` = GiB, `decimal` = GB (default: the user's storage unit). */
  style?: ByteStyle;
  /** Fraction digits (default 1). */
  digits?: number;
  /** Append the unit (default true). */
  withUnit?: boolean;
};

/** Auto-scaled byte count in the active storage unit, e.g. `8 * 1024 ** 3` → "8.6 GB". */
export function formatBytes(bytes: number, options: FormatBytesOptions = {}): string {
  const { style = getActiveUnits().storage, digits = 1, withUnit = true } = options;
  const text = formatByteSizeIn(bytes, style, digits);
  return withUnit ? text : text.replace(/\s\S+$/, '');
}

export type FormatByteSizeOptions = {
  /** `decimal` (1000 steps) or `binary` (1024 steps); defaults to the storage unit. */
  style?: ByteStyle;
  /** Fraction digits from KB/MB/GB upwards (default 1; bytes are whole). */
  digits?: number;
};

/** Auto-scaled byte count, e.g. `12_400_000` → "12.4 MB" and `3.9e9` → "3.9 GB". */
export function formatByteSize(bytes: number, options: FormatByteSizeOptions = {}): string {
  const { style = getActiveUnits().storage, digits = 1 } = options;
  return formatByteSizeIn(bytes, style, digits);
}
