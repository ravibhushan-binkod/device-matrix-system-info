import type { BatteryHealth } from '@/core/native';
import {
  computeHealthScore,
  parseSecurityPatchMs,
  securityPatchAgeDays,
  type HealthScoreInput,
} from '@/features/dashboard/services/health-score';

const NOW = Date.UTC(2026, 9, 20, 12, 0, 0);

function input(overrides: Partial<HealthScoreInput> = {}): HealthScoreInput {
  return {
    storageFreeRatio: 0.3,
    memoryUsedRatio: 0.5,
    batteryHealth: 'good',
    batteryTemperatureC: 30,
    thermalStatus: 'none',
    thermalHeadroom: 0.8,
    securityPatch: '2026-09-01',
    now: NOW,
    ...overrides,
  };
}

describe('parseSecurityPatchMs', () => {
  it('parses a strict Android patch date', () => {
    expect(parseSecurityPatchMs('2026-09-01')).toBe(Date.UTC(2026, 8, 1));
  });

  it('rejects loose or impossible dates instead of guessing', () => {
    expect(parseSecurityPatchMs('2026-9-1')).toBeNull();
    expect(parseSecurityPatchMs('2026-02-30')).toBeNull();
    expect(parseSecurityPatchMs('not a date')).toBeNull();
    expect(parseSecurityPatchMs(null)).toBeNull();
  });
});

describe('securityPatchAgeDays', () => {
  it('counts whole days and clamps future patches to zero', () => {
    expect(securityPatchAgeDays('2026-10-20', NOW)).toBe(0);
    expect(securityPatchAgeDays('2026-10-10', NOW)).toBe(10);
    expect(securityPatchAgeDays('2027-01-01', NOW)).toBe(0);
    expect(securityPatchAgeDays('bad', NOW)).toBeNull();
  });
});

describe('computeHealthScore', () => {
  it('returns 100 when every weighted check is healthy', () => {
    const score = computeHealthScore(input());
    expect(score.score).toBe(100);
    expect(score.availableChecks).toBe(5);
    expect(score.totalChecks).toBe(5);
    expect(score.checks.every((check) => check.state === 'good')).toBe(true);
  });

  it('keeps unavailable values out of both earned and total weight', () => {
    const score = computeHealthScore(
      input({
        storageFreeRatio: null,
        memoryUsedRatio: null,
        batteryHealth: null,
        batteryTemperatureC: null,
        thermalStatus: null,
        thermalHeadroom: null,
        securityPatch: null,
      }),
    );
    expect(score.score).toBeNull();
    expect(score.availableChecks).toBe(0);
    expect(score.checks.every((check) => check.state === 'unavailable')).toBe(true);
  });

  it('scores only the sources the device can read', () => {
    const score = computeHealthScore(
      input({
        storageFreeRatio: null,
        memoryUsedRatio: null,
        batteryHealth: null,
        batteryTemperatureC: null,
        thermalStatus: null,
        thermalHeadroom: null,
      }),
    );
    expect(score.availableChecks).toBe(1);
    expect(score.score).toBe(100);
    expect(score.checks.find((check) => check.id === 'storage')?.available).toBe(false);
  });

  it('drops the security score as the patch gets older', () => {
    const fresh = computeHealthScore(input({ securityPatch: '2026-09-01' }));
    const old = computeHealthScore(input({ securityPatch: '2024-01-01' }));
    expect(old.score).toBeLessThan(fresh.score ?? 0);
    expect(old.checks.find((check) => check.id === 'security')?.state).toBe('critical');
  });

  it('flags a hot, unhealthy battery', () => {
    const score = computeHealthScore(
      input({ batteryHealth: 'overheat' as BatteryHealth, batteryTemperatureC: 47 }),
    );
    const battery = score.checks.find((check) => check.id === 'battery');
    expect(battery?.state).toBe('critical');
    expect(battery?.earned).toBe(0);
  });

  it('uses thermal headroom when the status name is missing', () => {
    const score = computeHealthScore(input({ thermalStatus: null, thermalHeadroom: 0.2 }));
    const thermal = score.checks.find((check) => check.id === 'thermal');
    expect(thermal?.available).toBe(true);
    expect(thermal?.earned).toBe(5);
  });

  it('warns about low storage and high memory pressure', () => {
    const score = computeHealthScore(input({ storageFreeRatio: 0.08, memoryUsedRatio: 0.78 }));
    expect(score.checks.find((check) => check.id === 'storage')?.state).toBe('critical');
    expect(score.checks.find((check) => check.id === 'memory')?.state).toBe('warning');
  });
});
