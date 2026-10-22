export type ProximityState = 'near' | 'far' | 'unknown';

const NUMBER = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

/**
 * Android proximity sensors report `0` (or a small value) when something is
 * close and their maximum range when it is clear. Some OEM sensors use a
 * non-zero near value, so compare against half of the reported range.
 */
export function proximityState(value: number | null | undefined, maxRange: number): ProximityState {
  if (value == null || !Number.isFinite(value) || !Number.isFinite(maxRange) || maxRange <= 0) {
    return 'unknown';
  }
  return value < maxRange / 2 ? 'near' : 'far';
}

/** Bubble offset in dp, clamped to `radius`, from accelerometer x/y values. */
export function bubbleOffset(values: readonly number[], radius: number): { x: number; y: number } {
  const x = values[0] ?? 0;
  const y = values[1] ?? 0;
  if (!Number.isFinite(x) || !Number.isFinite(y) || radius <= 0) {
    return { x: 0, y: 0 };
  }
  const length = Math.hypot(x, y);
  if (length === 0) return { x: 0, y: 0 };
  // ±10 m/s² fills the arena; beyond that the bubble rests at the edge.
  const scaled = Math.min(radius, (length / 10) * radius);
  return {
    x: (x / length) * scaled,
    y: (y / length) * scaled,
  };
}

/** A 0–1 scale for the light meter; lux is logarithmic in practice. */
export function luxToRatio(lux: number | null | undefined): number {
  if (lux == null || !Number.isFinite(lux) || lux <= 0) return 0;
  return Math.min(1, Math.max(0, Math.log10(lux + 1) / 4));
}

/** "12 lx" / "1,240 lx"; null stays honest. */
export function formatLux(lux: number | null | undefined): string | null {
  if (lux == null || !Number.isFinite(lux)) return null;
  return `${NUMBER.format(Math.max(0, Math.round(lux)))} lx`;
}

/** The output routes Android can report for the headset test. */
export type AudioOutputRoute =
  'wired-headset' | 'usb-audio' | 'bluetooth' | 'earpiece' | 'speaker' | 'unknown';

export function audioOutputLabel(route: AudioOutputRoute): string {
  switch (route) {
    case 'wired-headset':
      return 'Wired headset';
    case 'usb-audio':
      return 'USB audio';
    case 'bluetooth':
      return 'Bluetooth audio';
    case 'earpiece':
      return 'Earpiece';
    case 'speaker':
      return 'Speaker';
    case 'unknown':
      return 'Unknown output';
  }
}

export function isHeadsetRoute(route: AudioOutputRoute): boolean {
  return route === 'wired-headset' || route === 'usb-audio';
}

/** Charging state from the battery plug value. */
export function isPlugged(plugged: string): boolean {
  return plugged !== 'none' && plugged !== 'unknown';
}
