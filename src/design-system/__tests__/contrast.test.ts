import { accents, palettes } from '@/design-system/tokens';

/**
 * WCAG 2.1 relative luminance and contrast ratio — keeps the palette honest.
 * Text pairs must reach AA (4.5:1); the accent tints must stay readable as
 * icon and highlight colours on every surface.
 */
function luminance(hex: string): number {
  const value = hex.replace('#', '');
  const channels = [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16) / 255);
  const [r, g, b] = channels.map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4),
  ) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const AA_TEXT = 4.5;
const schemes = ['dark', 'light'] as const;
const accentNames = Object.keys(accents) as (keyof typeof accents)[];

describe('colour contrast (WCAG AA)', () => {
  it.each(schemes)('%s: body and muted text on every surface', (scheme) => {
    const colors = palettes[scheme];
    for (const surface of [colors.background, colors.surface, colors.surface2]) {
      expect(contrast(colors.text, surface)).toBeGreaterThanOrEqual(AA_TEXT);
      expect(contrast(colors.muted, surface)).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });

  it.each(schemes)('%s: white labels on the primary fill', (scheme) => {
    const colors = palettes[scheme];
    expect(contrast(colors.onPrimary, colors.primarySolid)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it.each(schemes)('%s: primary reads as a link colour', (scheme) => {
    const colors = palettes[scheme];
    expect(contrast(colors.primary, colors.surface)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it.each(schemes)('%s: status colours as text on screen background and cards', (scheme) => {
    const colors = palettes[scheme];
    for (const tone of [colors.good, colors.warning, colors.critical]) {
      expect(contrast(tone, colors.background)).toBeGreaterThanOrEqual(AA_TEXT);
      expect(contrast(tone, colors.surface)).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });

  it.each(schemes)('%s: every accent choice reads on cards', (scheme) => {
    const colors = palettes[scheme];
    for (const name of accentNames) {
      const hex = accents[name][scheme];
      expect(contrast(hex, colors.surface)).toBeGreaterThanOrEqual(AA_TEXT);
      expect(contrast(hex, colors.surface2)).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });
});
