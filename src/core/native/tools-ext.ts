import { requireOptionalNativeModule } from 'expo';
import type ToolsExtModule from '@modules/tools-ext/src/ToolsExtModule';

import { ok, unavailable, type Result } from '@/core/result';

/** Instance type of the native module class (`import type` keeps the require erased). */
type NativeToolsExtModule = typeof ToolsExtModule;

let cached: NativeToolsExtModule | null | undefined;

function getModule(): NativeToolsExtModule | null {
  if (cached !== undefined) return cached;
  try {
    cached = requireOptionalNativeModule<NativeToolsExtModule>('ToolsExt');
  } catch {
    cached = null;
  }
  return cached;
}

function toResult(
  raw: { launched: boolean; reason: string | null } | null,
  noHandlerReason: string,
): Result<boolean> {
  if (!raw || !raw.launched) {
    return unavailable(
      raw?.reason === 'no-handler' ? noHandlerReason : 'The clock app could not be opened.',
    );
  }
  return ok(true);
}

/**
 * Prefills an alarm in the user's clock app. `days` are Calendar day codes
 * (1 = Sunday … 7 = Saturday); an empty list means a one-time alarm. Android
 * saves the entry in the clock app — Device Matrix stores nothing.
 */
export function startAlarm(
  hour: number,
  minute: number,
  message: string | null,
  days: readonly number[],
): Result<boolean> {
  const module = getModule();
  if (!module) return unavailable('The ToolsExt native module is not in this build.');
  try {
    return toResult(
      module.startAlarm(hour, minute, message, [...days]),
      'No clock app on this device handles alarms.',
    );
  } catch {
    return unavailable('The clock app could not be opened.');
  }
}

/** Prefills a timer in the user's clock app; the length is in seconds. */
export function startTimer(seconds: number, message: string | null): Result<boolean> {
  const module = getModule();
  if (!module) return unavailable('The ToolsExt native module is not in this build.');
  try {
    return toResult(
      module.startTimer(seconds, message),
      'No clock app on this device handles timers.',
    );
  } catch {
    return unavailable('The clock app could not be opened.');
  }
}
