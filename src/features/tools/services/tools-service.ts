import { Vibration } from 'react-native';

import {
  getTorchInfo,
  getVibrationInfo,
  setTorch,
  startAlarm,
  startTimer,
  type TorchInfo,
} from '@/core/native';
import { denied, ok, unavailable, type Result } from '@/core/result';
import { openSystemSettings } from '@/core/system-settings';
import type { AlarmRequest, VibrationPattern, WeekDay } from '@/features/tools/types';

/** Repeat-day chips, Sunday first — the Calendar day codes AlarmClock expects. */
export const WEEK_DAYS: readonly WeekDay[] = [
  { code: 1, letter: 'S', name: 'Sunday' },
  { code: 2, letter: 'M', name: 'Monday' },
  { code: 3, letter: 'T', name: 'Tuesday' },
  { code: 4, letter: 'W', name: 'Wednesday' },
  { code: 5, letter: 'T', name: 'Thursday' },
  { code: 6, letter: 'F', name: 'Friday' },
  { code: 7, letter: 'S', name: 'Saturday' },
];

const DAY_CODES = WEEK_DAYS.map((day) => day.code);

export function isValidAlarmTime(hour: number, minute: number): boolean {
  return (
    Number.isInteger(hour) &&
    hour >= 0 &&
    hour <= 23 &&
    Number.isInteger(minute) &&
    minute >= 0 &&
    minute <= 59
  );
}

/** "07:30" — always 24-hour, exactly what the clock app receives. */
export function formatClockTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/** "05:30" — mm:ss; the tool caps timers at 24 hours. */
export function formatTimerLength(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/** Drops unknown day codes and duplicates; keeps Calendar order. `null` when the time is invalid. */
export function normalizeAlarm(request: AlarmRequest): AlarmRequest | null {
  if (!isValidAlarmTime(request.hour, request.minute)) return null;
  const days = [...new Set(request.days.filter((day) => DAY_CODES.includes(day)))].sort(
    (a, b) => a - b,
  );
  return { hour: request.hour, minute: request.minute, label: request.label.trim(), days };
}

/** Hands the alarm to the clock app — Android keeps it there, Device Matrix stores nothing. */
export function sendAlarmToClock(request: AlarmRequest): Result<boolean> {
  const alarm = normalizeAlarm(request);
  if (!alarm) return unavailable('The alarm time is not valid.');
  return startAlarm(
    alarm.hour,
    alarm.minute,
    alarm.label.length > 0 ? alarm.label : null,
    alarm.days,
  );
}

export function sendTimerToClock(totalSeconds: number, label: string): Result<boolean> {
  if (!Number.isInteger(totalSeconds) || totalSeconds < 1 || totalSeconds > 86_400) {
    return unavailable('The timer length is not valid.');
  }
  const message = label.trim();
  return startTimer(totalSeconds, message.length > 0 ? message : null);
}

/** Opens the alarm list in the clock app. */
export function showAlarms() {
  return openSystemSettings('show-alarms');
}

export const VIBRATION_PATTERNS: readonly VibrationPattern[] = [
  { id: 'short', label: 'Short', pattern: [0, 100] },
  { id: 'long', label: 'Long', pattern: [0, 400] },
  { id: 'heartbeat', label: 'Heartbeat', pattern: [0, 120, 100, 120, 400, 400] },
];

/** Whether the device has a vibration motor at all (honesty: no button when it does not). */
export function readVibrationSupport(): Result<boolean> {
  const result = getVibrationInfo();
  if (result.status === 'unavailable') return unavailable(result.reason);
  if (result.status === 'denied') return denied(result.permission);
  return ok(result.value.hasVibrator);
}

export function runVibrationPattern(pattern: VibrationPattern): void {
  try {
    Vibration.vibrate(pattern.pattern);
  } catch {
    // The check-up flow already reports when the device has no motor.
  }
}

export function stopVibration(): void {
  try {
    Vibration.cancel();
  } catch {
    // Nothing was running.
  }
}

/* ---------------------------------------------------------------- flashlight */

export function readTorch(): Result<TorchInfo> {
  return getTorchInfo();
}

export function switchTorch(enabled: boolean): Result<boolean> {
  return setTorch(enabled);
}
