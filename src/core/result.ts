/**
 * Every reading in the app returns one of these three states instead of
 * throwing or silently faking a value.
 *
 * - `ok`          the value was read through a normal Android API
 * - `unavailable` the OS, the device or the manufacturer does not expose it
 * - `denied`      the user denied a runtime permission the value requires
 */
export type Result<T> =
  | { readonly status: 'ok'; readonly value: T }
  | { readonly status: 'unavailable'; readonly reason: string }
  | { readonly status: 'denied'; readonly permission: string };

export function ok<T>(value: T): Result<T> {
  return { status: 'ok', value };
}

export function unavailable<T = never>(reason: string): Result<T> {
  return { status: 'unavailable', reason };
}

export function denied<T = never>(permission: string): Result<T> {
  return { status: 'denied', permission };
}

export function isOk<T>(result: Result<T>): result is { readonly status: 'ok'; readonly value: T } {
  return result.status === 'ok';
}

/**
 * Human-readable reason for a non-ok result. UI code uses this instead of
 * assuming every failure is `unavailable` (a denied permission has no reason
 * string, only the permission name).
 */
export function failureMessage(result: Result<unknown>): string {
  if (result.status === 'ok') return '';
  return result.status === 'denied' ? `Permission needed: ${result.permission}` : result.reason;
}

/** Transforms the value of an `ok` result; other states pass through unchanged. */
export function mapResult<T, U>(result: Result<T>, fn: (value: T) => U): Result<U> {
  return result.status === 'ok' ? ok(fn(result.value)) : result;
}

export function getOrElse<T>(result: Result<T>, fallback: T): T {
  return result.status === 'ok' ? result.value : fallback;
}

/** User-facing copy for a non-ok result, or `null` when the reading is fine. */
export function describeResult<T>(result: Result<T>): string | null {
  switch (result.status) {
    case 'ok':
      return null;
    case 'unavailable':
      return 'Not available on this device';
    case 'denied':
      return 'Permission denied';
  }
}
