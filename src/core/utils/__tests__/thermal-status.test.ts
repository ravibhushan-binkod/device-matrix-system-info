import { thermalStatusLabel } from '@/core/utils/thermal-status';

describe('thermalStatusLabel', () => {
  it('labels Android thermal statuses', () => {
    expect(thermalStatusLabel('none')).toBe('Normal');
    expect(thermalStatusLabel('light')).toBe('Light');
    expect(thermalStatusLabel('moderate')).toBe('Moderate');
    expect(thermalStatusLabel('severe')).toBe('Severe');
    expect(thermalStatusLabel('critical')).toBe('Critical');
    expect(thermalStatusLabel('emergency')).toBe('Emergency');
    expect(thermalStatusLabel('shutdown')).toBe('Shutdown');
  });

  it('returns null when unknown or missing', () => {
    expect(thermalStatusLabel('unknown')).toBeNull();
    expect(thermalStatusLabel(null)).toBeNull();
  });
});
