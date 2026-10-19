import { chipsetLabel } from '@/core/utils/chipset';

describe('chipsetLabel', () => {
  it('joins manufacturer and model', () => {
    expect(
      chipsetLabel({
        socManufacturer: 'MediaTek',
        socModel: 'Dimensity 7200 Pro',
        hardware: 'mt6789',
      }),
    ).toBe('MediaTek Dimensity 7200 Pro');
  });

  it('uses whichever SOC part exists', () => {
    expect(
      chipsetLabel({ socManufacturer: null, socModel: 'Dimensity 7200', hardware: 'mt6789' }),
    ).toBe('Dimensity 7200');
  });

  it('falls back to the hardware board name', () => {
    expect(chipsetLabel({ socManufacturer: null, socModel: null, hardware: 'mt6789' })).toBe(
      'mt6789',
    );
  });

  it('returns null when nothing is reported', () => {
    expect(chipsetLabel({ socManufacturer: null, socModel: null, hardware: '  ' })).toBeNull();
  });
});
