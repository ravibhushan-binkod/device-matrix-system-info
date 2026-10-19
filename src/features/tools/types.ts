/** Repeat-day codes in AlarmClock's Calendar order (Sunday = 1 … Saturday = 7). */
export type WeekDay = {
  code: number;
  /** Single letter for the chip, e.g. "M". */
  letter: string;
  name: string;
};

/** Everything the clock app needs; an empty `days` list means a one-time alarm. */
export type AlarmRequest = {
  hour: number;
  minute: number;
  label: string;
  days: number[];
};

export type VibrationPatternId = 'short' | 'long' | 'heartbeat';

export type VibrationPattern = {
  id: VibrationPatternId;
  label: string;
  /** react-native Vibration pattern: [wait, vibrate, wait, vibrate, …] in ms. */
  pattern: number[];
};
