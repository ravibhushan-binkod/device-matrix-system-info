import {
  audioOutputLabel,
  bubbleOffset,
  formatLux,
  isHeadsetRoute,
  isPlugged,
  luxToRatio,
  proximityState,
} from '@/features/hardware-tests/services/test-logic';

describe('proximityState', () => {
  it('uses half the reported range as the near/far boundary', () => {
    expect(proximityState(0, 5)).toBe('near');
    expect(proximityState(2, 5)).toBe('near');
    expect(proximityState(5, 5)).toBe('far');
    expect(proximityState(100, 100)).toBe('far');
  });

  it('returns unknown for missing or invalid readings', () => {
    expect(proximityState(undefined, 5)).toBe('unknown');
    expect(proximityState(null, 5)).toBe('unknown');
    expect(proximityState(1, 0)).toBe('unknown');
    expect(proximityState(Number.NaN, 5)).toBe('unknown');
  });
});

describe('bubbleOffset', () => {
  it('keeps the bubble inside the arena', () => {
    expect(bubbleOffset([100, 0, 9], 50)).toEqual({ x: 50, y: 0 });
    expect(bubbleOffset([0, -10, 0], 50)).toEqual({ x: 0, y: -50 });
  });

  it('scales small tilts proportionally', () => {
    const offset = bubbleOffset([5, 0, 0], 100);
    expect(offset.x).toBeCloseTo(50);
    expect(offset.y).toBe(0);
  });

  it('handles missing values and a zero radius', () => {
    expect(bubbleOffset([], 50)).toEqual({ x: 0, y: 0 });
    expect(bubbleOffset([5, 5, 5], 0)).toEqual({ x: 0, y: 0 });
  });
});

describe('lux helpers', () => {
  it('maps lux logarithmically to a 0–1 meter', () => {
    expect(luxToRatio(0)).toBe(0);
    expect(luxToRatio(9)).toBeCloseTo(0.25);
    expect(luxToRatio(10_000)).toBe(1);
    expect(luxToRatio(null)).toBe(0);
  });

  it('formats a rounded lux value', () => {
    expect(formatLux(12)).toBe('12 lx');
    expect(formatLux(1234.4)).toBe('1,234 lx');
    expect(formatLux(null)).toBeNull();
  });
});

describe('audio and charging helpers', () => {
  it('labels every output route', () => {
    expect(audioOutputLabel('wired-headset')).toBe('Wired headset');
    expect(audioOutputLabel('usb-audio')).toBe('USB audio');
    expect(audioOutputLabel('unknown')).toBe('Unknown output');
  });

  it('only treats wired and USB routes as the headset check', () => {
    expect(isHeadsetRoute('wired-headset')).toBe(true);
    expect(isHeadsetRoute('usb-audio')).toBe(true);
    expect(isHeadsetRoute('bluetooth')).toBe(false);
    expect(isHeadsetRoute('speaker')).toBe(false);
  });

  it('recognises every non-empty plug state', () => {
    expect(isPlugged('usb')).toBe(true);
    expect(isPlugged('wireless')).toBe(true);
    expect(isPlugged('none')).toBe(false);
    expect(isPlugged('unknown')).toBe(false);
  });
});
