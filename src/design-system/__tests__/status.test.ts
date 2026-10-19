import { withAlpha } from '@/design-system/color';
import { clamp01, statusColor, statusTone } from '@/design-system/status';
import { palettes } from '@/design-system/tokens';

const colors = palettes.dark;

describe('statusTone', () => {
  it('maps ratios to tones at the boundaries', () => {
    expect(statusTone(0)).toBe('good');
    expect(statusTone(0.699)).toBe('good');
    expect(statusTone(0.7)).toBe('warning');
    expect(statusTone(0.879)).toBe('warning');
    expect(statusTone(0.88)).toBe('critical');
    expect(statusTone(1.4)).toBe('critical');
    expect(statusTone(-1)).toBe('good');
  });

  it('honours custom thresholds', () => {
    expect(statusTone(0.5, 0.4, 0.6)).toBe('warning');
    expect(statusTone(0.6, 0.4, 0.6)).toBe('critical');
  });
});

describe('statusColor', () => {
  it('resolves to the palette colours', () => {
    expect(statusColor(0.2, colors)).toBe(colors.good);
    expect(statusColor(0.75, colors)).toBe(colors.warning);
    expect(statusColor(0.95, colors)).toBe(colors.critical);
  });
});

describe('clamp01', () => {
  it('clamps and guards NaN', () => {
    expect(clamp01(-2)).toBe(0);
    expect(clamp01(0.5)).toBe(0.5);
    expect(clamp01(3)).toBe(1);
    expect(clamp01(Number.NaN)).toBe(0);
  });
});

describe('withAlpha', () => {
  it('appends a rounded alpha byte', () => {
    expect(withAlpha('#22D3EE', 0.12)).toBe('#22D3EE1F');
    expect(withAlpha('#22D3EE', 1)).toBe('#22D3EEFF');
    expect(withAlpha('#22D3EE', 0)).toBe('#22D3EE00');
  });

  it('returns non-hex input unchanged', () => {
    expect(withAlpha('rgba(0, 0, 0, 0.1)', 0.5)).toBe('rgba(0, 0, 0, 0.1)');
  });
});
