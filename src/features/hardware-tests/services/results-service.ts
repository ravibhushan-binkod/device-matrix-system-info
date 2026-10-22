import { getString, setString } from '@/core/storage/mmkv';
import {
  HARDWARE_TESTS,
  RUNNABLE_HARDWARE_TESTS,
  getHardwareTest,
  isHardwareTestId,
} from '@/features/hardware-tests/services/test-catalog';
import type {
  HardwareTestId,
  HardwareTestOutcome,
  HardwareTestResults,
  HardwareTestStatus,
  StoredTestResult,
} from '@/features/hardware-tests/types';

/** One MMKV JSON document; small, local and never uploaded. */
export const HARDWARE_RESULTS_KEY = 'hardware-tests.results.v1';

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

function isOutcome(value: unknown): value is HardwareTestOutcome {
  return value === 'pass' || value === 'fail';
}

function isStoredResult(value: unknown): value is StoredTestResult {
  if (value == null || typeof value !== 'object') return false;
  const candidate = value as Partial<StoredTestResult>;
  return (
    isOutcome(candidate.outcome) &&
    typeof candidate.testedAt === 'number' &&
    Number.isFinite(candidate.testedAt) &&
    candidate.testedAt > 0
  );
}

/**
 * Reads the MMKV document defensively. A corrupt or partially written value
 * becomes "no results" instead of crashing the checkup or the report.
 */
export function parseResults(raw: string | undefined | null): HardwareTestResults {
  if (!raw) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

  const results: HardwareTestResults = {};
  for (const [id, value] of Object.entries(parsed)) {
    if (!isHardwareTestId(id) || !isStoredResult(value)) continue;
    results[id] = { outcome: value.outcome, testedAt: value.testedAt };
  }
  return results;
}

export function serializeResults(results: HardwareTestResults): string {
  return JSON.stringify(results);
}

export function readTestResults(): HardwareTestResults {
  return parseResults(getString(HARDWARE_RESULTS_KEY));
}

function writeResults(results: HardwareTestResults): HardwareTestResults {
  setString(HARDWARE_RESULTS_KEY, serializeResults(results));
  return results;
}

/** Stores one pass/fail with the current time and returns the full result set. */
export function recordTestResult(
  id: HardwareTestId,
  outcome: HardwareTestOutcome,
  now: number = Date.now(),
): HardwareTestResults {
  return writeResults({ ...readTestResults(), [id]: { outcome, testedAt: now } });
}

/** Removes a result, returning the test to "untested" (used by Retest). */
export function clearTestResult(id: HardwareTestId): HardwareTestResults {
  const results = { ...readTestResults() };
  delete results[id];
  return writeResults(results);
}

export function testStatus(results: HardwareTestResults, id: HardwareTestId): HardwareTestStatus {
  return results[id]?.outcome ?? 'untested';
}

export type HardwareTestSummary = {
  /** Runnable tests only; optional/skipped tests are not part of progress. */
  total: number;
  passed: number;
  failed: number;
  untested: number;
  /** 0–100, rounded. */
  percent: number;
};

export function summarizeResults(results: HardwareTestResults): HardwareTestSummary {
  let passed = 0;
  let failed = 0;
  for (const definition of RUNNABLE_HARDWARE_TESTS) {
    const outcome = results[definition.id]?.outcome;
    if (outcome === 'pass') passed += 1;
    if (outcome === 'fail') failed += 1;
  }
  const total = RUNNABLE_HARDWARE_TESTS.length;
  const untested = total - passed - failed;
  return {
    total,
    passed,
    failed,
    untested,
    percent: total === 0 ? 0 : Math.round(((passed + failed) / total) * 100),
  };
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function clock(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/** "Today, 14:03" / "Yesterday, 09:12" / "18 Oct 2026". */
export function formatTestDate(timestamp: number, now: Date = new Date()): string {
  const date = new Date(timestamp);
  if (!Number.isFinite(timestamp) || Number.isNaN(date.getTime())) return 'Unknown date';
  if (isSameDay(date, now)) return `Today, ${clock(date)}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(date, yesterday)) return `Yesterday, ${clock(date)}`;
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

const STATUS_LABELS: Record<HardwareTestStatus, string> = {
  pass: 'Passed',
  fail: 'Failed',
  untested: 'Untested',
};

export function testStatusLabel(status: HardwareTestStatus): string {
  return STATUS_LABELS[status];
}

/** Plain-text checklist for the share sheet (no file, no upload). */
export function buildChecklistText(results: HardwareTestResults, now: Date = new Date()): string {
  const summary = summarizeResults(results);
  const lines = HARDWARE_TESTS.map((definition) => {
    const result = results[definition.id];
    const mark = result ? (result.outcome === 'pass' ? '[x]' : '[!]') : '[ ]';
    const state = result
      ? `${STATUS_LABELS[result.outcome]} (${formatTestDate(result.testedAt, now)})`
      : definition.availability === 'ready'
        ? 'Untested'
        : definition.availability === 'off'
          ? 'Off in this build'
          : 'Skipped on this device';
    return `${mark} ${definition.title} — ${state}`;
  });

  return [
    'Used-phone hardware checklist',
    `Device Matrix · ${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`,
    `${summary.passed} passed, ${summary.failed} failed, ${summary.untested} untested`,
    '',
    ...lines,
    '',
    'Results were recorded on the phone. Shared from Device Matrix: System Info.',
  ].join('\n');
}

/** Compact label for the report and overview cards. */
export function reportLine(
  results: HardwareTestResults,
  id: HardwareTestId,
  now: Date = new Date(),
): string {
  const definition = getHardwareTest(id);
  const result = results[id];
  if (result) return `${STATUS_LABELS[result.outcome]} · ${formatTestDate(result.testedAt, now)}`;
  if (definition.availability === 'off') return 'Off in this build';
  if (definition.availability === 'unavailable') return 'Skipped on this device';
  return 'Untested';
}
