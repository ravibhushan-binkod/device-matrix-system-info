import type { BatteryHealth, ThermalStatusName } from '@/core/native';
import type {
  HealthCheck,
  HealthCheckId,
  HealthCheckState,
  HealthScore,
} from '@/features/dashboard/types';

export type HealthScoreInput = {
  /** Free fraction of the internal storage, 0..1. */
  storageFreeRatio: number | null;
  /** Used fraction of RAM, 0..1. */
  memoryUsedRatio: number | null;
  batteryHealth: BatteryHealth | null;
  batteryTemperatureC: number | null;
  thermalStatus: ThermalStatusName | null;
  /** Android's thermal headroom, 0..1. */
  thermalHeadroom: number | null;
  /** `Build.VERSION.SECURITY_PATCH`, usually `YYYY-MM-DD`. */
  securityPatch: string | null;
  /** Injectable for tests. */
  now?: number;
};

const WEIGHTS: Record<HealthCheckId, number> = {
  security: 30,
  storage: 25,
  memory: 20,
  battery: 15,
  thermal: 10,
};

const LABELS: Record<HealthCheckId, string> = {
  security: 'Security patch',
  storage: 'Free storage',
  memory: 'Memory pressure',
  battery: 'Battery condition',
  thermal: 'Thermal headroom',
};

const TOTAL_CHECKS = 5;
const DAY_MS = 86_400_000;

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function stateFor(earned: number, weight: number): HealthCheckState {
  const ratio = weight > 0 ? earned / weight : 0;
  if (ratio >= 0.8) return 'good';
  if (ratio >= 0.5) return 'warning';
  return 'critical';
}

function check(id: HealthCheckId, earned: number | null): HealthCheck {
  const weight = WEIGHTS[id];
  if (earned == null) {
    return { id, label: LABELS[id], weight, earned: 0, available: false, state: 'unavailable' };
  }
  const safe = Math.max(0, Math.min(weight, earned));
  return {
    id,
    label: LABELS[id],
    weight,
    earned: safe,
    available: true,
    state: stateFor(safe, weight),
  };
}

/** Parses an Android security-patch string without guessing an invalid date. */
export function parseSecurityPatchMs(value: string | null): number | null {
  if (value == null) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const ms = Date.UTC(year, month - 1, day);
  const parsed = new Date(ms);
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }
  return ms;
}

/** Age of the security patch in whole days; `null` for a missing/invalid date. */
export function securityPatchAgeDays(value: string | null, now = Date.now()): number | null {
  const ms = parseSecurityPatchMs(value);
  if (ms == null) return null;
  return Math.max(0, Math.floor((now - ms) / DAY_MS));
}

function securityPoints(patch: string | null, now: number): number | null {
  const age = securityPatchAgeDays(patch, now);
  if (age == null) return null;
  if (age <= 90) return WEIGHTS.security;
  if (age <= 200) return 24;
  if (age <= 365) return 18;
  if (age <= 550) return 10;
  return 4;
}

function storagePoints(freeRatio: number | null): number | null {
  if (freeRatio == null || !Number.isFinite(freeRatio)) return null;
  const free = clamp01(freeRatio);
  if (free >= 0.2) return WEIGHTS.storage;
  if (free >= 0.15) return 22;
  if (free >= 0.1) return 16;
  if (free >= 0.05) return 9;
  return 2;
}

function memoryPoints(usedRatio: number | null): number | null {
  if (usedRatio == null || !Number.isFinite(usedRatio)) return null;
  const used = clamp01(usedRatio);
  if (used <= 0.65) return WEIGHTS.memory;
  if (used <= 0.75) return 16;
  if (used <= 0.85) return 10;
  if (used <= 0.92) return 5;
  return 0;
}

const UNHEALTHY: readonly BatteryHealth[] = ['overheat', 'dead', 'over-voltage', 'failure', 'cold'];

function batteryPoints(health: BatteryHealth | null, temperatureC: number | null): number | null {
  const hasHealth = health != null && health !== 'unknown';
  const hasTemperature = temperatureC != null && Number.isFinite(temperatureC);
  if (!hasHealth && !hasTemperature) return null;

  if (health === 'overheat') return 0;
  if (health != null && UNHEALTHY.includes(health)) return 4;
  if (hasTemperature) {
    const temperature = temperatureC as number;
    if (temperature >= 45) return 5;
    if (temperature >= 42) return 9;
    if (temperature <= 0) return 6;
    if (temperature <= 10) return 10;
  }
  if (health === 'good') return WEIGHTS.battery;
  if (health === 'unknown') return 11;
  return 9;
}

const THERMAL_POINTS: Record<ThermalStatusName, number | null> = {
  none: 10,
  light: 9,
  moderate: 6,
  severe: 3,
  critical: 1,
  emergency: 0,
  shutdown: 0,
  unknown: null,
};

function thermalPoints(status: ThermalStatusName | null, headroom: number | null): number | null {
  const fromStatus = status == null ? null : THERMAL_POINTS[status];
  if (fromStatus != null) return fromStatus;
  if (headroom == null || !Number.isFinite(headroom)) return null;
  const value = clamp01(headroom);
  if (value >= 0.5) return 10;
  if (value >= 0.3) return 8;
  if (value >= 0.15) return 5;
  if (value >= 0.05) return 3;
  return 1;
}

/**
 * One transparent health score from the readings Android actually exposes.
 * Unavailable sources are left out of both the earned points and the total
 * weight, so a device that hides a value is not punished for it.
 */
export function computeHealthScore(input: HealthScoreInput): HealthScore {
  const now = input.now ?? Date.now();
  const checks: HealthCheck[] = [
    check('security', securityPoints(input.securityPatch, now)),
    check('storage', storagePoints(input.storageFreeRatio)),
    check('memory', memoryPoints(input.memoryUsedRatio)),
    check('battery', batteryPoints(input.batteryHealth, input.batteryTemperatureC)),
    check('thermal', thermalPoints(input.thermalStatus, input.thermalHeadroom)),
  ];

  const available = checks.filter((entry) => entry.available);
  const earned = available.reduce((sum, entry) => sum + entry.earned, 0);
  const weight = available.reduce((sum, entry) => sum + entry.weight, 0);

  return {
    score: weight > 0 ? Math.round((earned / weight) * 100) : null,
    availableChecks: available.length,
    totalChecks: TOTAL_CHECKS,
    checks,
  };
}
