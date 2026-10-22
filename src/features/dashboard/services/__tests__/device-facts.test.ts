import {
  buildDeviceFacts,
  estimateDeviceAgeYears,
  formatBuildDate,
  formatDeviceAge,
  formatFirstApiLevel,
} from '@/features/dashboard/services/device-facts';

describe('formatBuildDate', () => {
  it('formats a valid build timestamp', () => {
    expect(formatBuildDate(new Date(2026, 9, 20, 9, 30).getTime())).toBe('20 Oct 2026');
  });

  it('returns null for missing or invalid timestamps', () => {
    expect(formatBuildDate(null)).toBeNull();
    expect(formatBuildDate(0)).toBeNull();
    expect(formatBuildDate(Number.NaN)).toBeNull();
  });
});

describe('formatFirstApiLevel', () => {
  it('labels a real API level', () => {
    expect(formatFirstApiLevel(33)).toBe('API 33');
  });

  it('rejects nonsense', () => {
    expect(formatFirstApiLevel(null)).toBeNull();
    expect(formatFirstApiLevel(0)).toBeNull();
    expect(formatFirstApiLevel(31.5)).toBeNull();
  });
});

describe('estimateDeviceAgeYears', () => {
  it('uses the launch Android release year', () => {
    expect(estimateDeviceAgeYears(33, new Date(2026, 9, 20).getTime())).toBe(4);
    expect(estimateDeviceAgeYears(36, new Date(2026, 9, 20).getTime())).toBe(1);
  });

  it('never guesses for an unknown launch level', () => {
    expect(estimateDeviceAgeYears(null)).toBeNull();
    expect(estimateDeviceAgeYears(99)).toBeNull();
  });
});

describe('formatDeviceAge', () => {
  it('uses honest rounded labels', () => {
    expect(formatDeviceAge(0)).toBe('Under 1 year');
    expect(formatDeviceAge(1)).toBe('~1 year');
    expect(formatDeviceAge(4)).toBe('~4 years');
    expect(formatDeviceAge(null)).toBeNull();
  });
});

describe('buildDeviceFacts', () => {
  it('derives labels without changing the raw values', () => {
    const now = new Date(2026, 9, 20).getTime();
    const facts = buildDeviceFacts(
      {
        buildTimeMillis: new Date(2026, 5, 12).getTime(),
        securityPatch: '2026-06-01',
        firstApiLevel: 33,
      },
      now,
    );
    expect(facts).toEqual({
      buildDateMillis: new Date(2026, 5, 12).getTime(),
      buildDateLabel: '12 Jun 2026',
      securityPatch: '2026-06-01',
      firstApiLevel: 33,
      estimatedAgeYears: 4,
      estimatedAgeLabel: '~4 years',
    });
  });

  it('keeps hidden values null', () => {
    const facts = buildDeviceFacts(
      { buildTimeMillis: null, securityPatch: null, firstApiLevel: null },
      Date.now(),
    );
    expect(facts.buildDateLabel).toBeNull();
    expect(facts.firstApiLevel).toBeNull();
    expect(facts.estimatedAgeLabel).toBeNull();
  });
});
