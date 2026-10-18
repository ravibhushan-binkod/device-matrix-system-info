import type { DisplayInfo, DisplayMode } from '@/core/native';
import {
  brightnessModeLabel,
  brightnessPercent,
  buildModeRows,
  diagonalInches,
  formatInches,
  formatRefreshRate,
  formatResolution,
  hdrLabel,
  modeLabel,
  uniqueDisplayModes,
} from '@/features/display/services/display-service';

jest.mock('@/core/native', () => ({
  getDisplayInfo: jest.fn(),
}));

function display(overrides: Partial<DisplayInfo> = {}): DisplayInfo {
  return {
    widthPx: 1084,
    heightPx: 2412,
    densityDpi: 399,
    density: 2.49,
    xdpi: 391.9,
    ydpi: 393.3,
    refreshRateHz: 120,
    supportedModes: [],
    isHdr: true,
    hdrTypes: ['HDR10'],
    brightness: 128,
    brightnessMode: 'manual',
    screenTimeoutMs: 30_000,
    ...overrides,
  };
}

describe('formatResolution', () => {
  it('formats pixel sizes', () => {
    expect(formatResolution(1084, 2412)).toBe('1084 × 2412 px');
  });

  it('returns null for missing or zero sizes', () => {
    expect(formatResolution(null, 2412)).toBeNull();
    expect(formatResolution(0, 0)).toBeNull();
  });
});

describe('diagonalInches', () => {
  it('computes the panel diagonal', () => {
    const diagonal = diagonalInches(1084, 2412, 391.9, 393.3);
    expect(diagonal).toBeCloseTo(6.7, 1);
  });

  it('returns null when the dpi is missing', () => {
    expect(diagonalInches(1084, 2412, 0, 0)).toBeNull();
    expect(diagonalInches(null, 2412, 391, 393)).toBeNull();
  });
});

describe('formatInches and formatRefreshRate', () => {
  it('formats values', () => {
    expect(formatInches(6.7)).toBe('6.7 in');
    expect(formatRefreshRate(119.9987)).toBe('120 Hz');
  });

  it('returns null for invalid input', () => {
    expect(formatInches(null)).toBeNull();
    expect(formatInches(0)).toBeNull();
    expect(formatRefreshRate(null)).toBeNull();
    expect(formatRefreshRate(0)).toBeNull();
  });
});

describe('uniqueDisplayModes', () => {
  const modes: DisplayMode[] = [
    { widthPx: 1084, heightPx: 2412, refreshRateHz: 120 },
    { widthPx: 1084, heightPx: 2412, refreshRateHz: 120.0001 },
    { widthPx: 1084, heightPx: 2412, refreshRateHz: 60 },
    { widthPx: 1084, heightPx: 2412, refreshRateHz: 60 },
  ];

  it('removes duplicates by size and rounded rate', () => {
    const unique = uniqueDisplayModes(modes);
    expect(unique).toHaveLength(2);
    expect(unique[0]?.refreshRateHz).toBe(120);
    expect(unique[1]?.refreshRateHz).toBe(60);
  });

  it('labels modes', () => {
    expect(modeLabel(modes[0]!)).toBe('1084 × 2412 · 120 Hz');
  });
});

describe('buildModeRows', () => {
  it('caps the rows and counts the hidden ones', () => {
    const modes: DisplayMode[] = Array.from({ length: 8 }, (_, index) => ({
      widthPx: 1084 + index,
      heightPx: 2412,
      refreshRateHz: 60,
    }));
    const result = buildModeRows(display({ supportedModes: modes }), 6);
    expect(result.rows).toHaveLength(6);
    expect(result.hiddenCount).toBe(2);
    expect(result.rows[0]?.label).toBe('1084 × 2412 · 60 Hz');
  });
});

describe('brightnessPercent and brightnessModeLabel', () => {
  it('maps the 0–255 scale to percent', () => {
    expect(brightnessPercent(255)).toBe(100);
    expect(brightnessPercent(128)).toBe(50);
    expect(brightnessPercent(0)).toBe(0);
    expect(brightnessPercent(null)).toBeNull();
  });

  it('labels the brightness mode', () => {
    expect(brightnessModeLabel('auto')).toBe('Auto');
    expect(brightnessModeLabel('manual')).toBe('Manual');
    expect(brightnessModeLabel(null)).toBeNull();
  });
});

describe('hdrLabel', () => {
  it('lists the reported HDR types', () => {
    expect(hdrLabel(true, ['HDR10', 'HLG'])).toBe('HDR10 · HLG');
  });

  it('falls back to Yes/No without a type list', () => {
    expect(hdrLabel(true, [])).toBe('Supported');
    expect(hdrLabel(false, [])).toBe('No');
    expect(hdrLabel(null, [])).toBeNull();
  });
});
