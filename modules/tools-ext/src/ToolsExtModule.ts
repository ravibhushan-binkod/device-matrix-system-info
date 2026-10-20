import { NativeModule, requireNativeModule } from 'expo';

import type { NativeClockLaunch } from './ToolsExt.types';

declare class ToolsExtModule extends NativeModule<Record<string, never>> {
  /** Prefills an alarm in the user's clock app; days are Calendar day codes (1 = Sunday … 7 = Saturday). */
  startAlarm(
    hour: number,
    minute: number,
    message: string | null,
    days: number[],
  ): NativeClockLaunch | null;
  /** Prefills a timer in the user's clock app; the length is in seconds. */
  startTimer(seconds: number, message: string | null): NativeClockLaunch | null;
}

export default requireNativeModule<ToolsExtModule>('ToolsExt');
