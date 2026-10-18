import { palettes, radius, spacing } from '@/design-system/tokens';

describe('design tokens', () => {
  it('defines every color token for both schemes', () => {
    const expectedKeys = [
      'background',
      'surface',
      'surfaceRaised',
      'border',
      'text',
      'textMuted',
      'accent',
      'success',
      'warning',
      'danger',
    ] as const;

    for (const scheme of ['dark', 'light'] as const) {
      for (const key of expectedKeys) {
        expect(palettes[scheme][key]).toMatch(/^#[0-9A-F]{6}$/i);
      }
    }
  });

  it('keeps the spacing and radius scales ordered', () => {
    const spacingValues = [spacing.xs, spacing.sm, spacing.md, spacing.lg, spacing.xl];
    expect(spacingValues).toEqual([...spacingValues].sort((a, b) => a - b));

    expect(radius.sm).toBeLessThan(radius.md);
    expect(radius.md).toBeLessThan(radius.lg);
  });
});
