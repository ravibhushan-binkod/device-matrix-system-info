import { accents, palettes, radius, spacing, typography } from '@/design-system/tokens';

describe('tokens', () => {
  it('defines both schemes with identical keys', () => {
    expect(Object.keys(palettes.dark).sort()).toEqual(Object.keys(palettes.light).sort());
  });

  it('uses the specified base colours', () => {
    expect(palettes.dark.background).toBe('#0B0F14');
    expect(palettes.light.background).toBe('#F6F8FC');
    expect(palettes.dark.surface).toBe('#131A22');
    expect(palettes.light.surface).toBe('#FFFFFF');
    expect(palettes.dark.text).toBe('#E8EEF5');
    expect(palettes.light.text).toBe('#111827');
    expect(palettes.dark.accent).toBe('#22D3EE');
    expect(palettes.dark.primary).toBe('#4F8CFF');
  });

  it('keeps spacing on the 4 dp grid', () => {
    for (const value of Object.values(spacing)) {
      expect(value % 4).toBe(0);
    }
  });

  it('keeps the specified radius scale', () => {
    expect(radius.card).toBe(20);
    expect(radius.button).toBe(14);
    expect(radius.chip).toBe(999);
  });

  it('keeps the type scale', () => {
    expect(typography.display.fontSize).toBe(34);
    expect(typography.title.fontSize).toBe(20);
    expect(typography.body.fontSize).toBe(14);
    expect(typography.caption.fontSize).toBe(12);
    expect(typography.mono.fontSize).toBe(13);
  });

  it('exposes the four accent choices', () => {
    expect(Object.keys(accents).sort()).toEqual(['blue', 'cyan', 'green', 'violet']);
  });
});
