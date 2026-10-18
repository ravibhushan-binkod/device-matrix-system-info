import type { BatteryReading } from '@/core/native';
import {
  getBatteryInfo,
  getDeviceIdentity,
  getMemoryInfo,
  getStorageInfo,
  getUptime,
} from '@/core/native';
import { denied, ok, unavailable } from '@/core/result';
import { palettes } from '@/design-system/tokens';
import {
  batteryRingColor,
  readDashboardSummary,
} from '@/features/dashboard/services/dashboard-service';

jest.mock('@/core/native', () => ({
  getBatteryInfo: jest.fn(),
  getDeviceIdentity: jest.fn(),
  getMemoryInfo: jest.fn(),
  getStorageInfo: jest.fn(),
  getUptime: jest.fn(),
}));

const identityMock = jest.mocked(getDeviceIdentity);
const uptimeMock = jest.mocked(getUptime);
const memoryMock = jest.mocked(getMemoryInfo);
const storageMock = jest.mocked(getStorageInfo);
const batteryMock = jest.mocked(getBatteryInfo);

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function reading(overrides: Partial<BatteryReading> = {}): BatteryReading {
  return {
    level: 39,
    percent: 39,
    status: 'charging',
    plugged: 'usb',
    health: 'good',
    temperatureC: 38,
    voltageMv: 3881,
    technology: 'Li-ion',
    currentNowUa: 676_100,
    chargeCounterUah: 1_949_220,
    cycleCount: 787,
    powerSave: false,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  identityMock.mockReturnValue(
    ok({ brand: 'samsung', model: 'SM-S918B', androidVersion: '15', apiLevel: 35 }),
  );
  uptimeMock.mockReturnValue(ok({ uptimeMillis: 15 * DAY + 14 * HOUR + 26 * MINUTE }));
  memoryMock.mockReturnValue(
    ok({ totalBytes: 8_000, availableBytes: 3_000, thresholdBytes: 100, lowMemory: false }),
  );
  storageMock.mockReturnValue(
    ok({ internal: { totalBytes: 200_000, freeBytes: 50_000 }, volumes: [] }),
  );
  batteryMock.mockReturnValue(ok(reading()));
});

describe('readDashboardSummary', () => {
  it('maps memory to used bytes and percent', () => {
    const summary = readDashboardSummary();
    expect(summary.memory).toEqual(ok({ usedBytes: 5_000, totalBytes: 8_000, percent: 62.5 }));
  });

  it('maps storage to used bytes and percent', () => {
    const summary = readDashboardSummary();
    expect(summary.storage).toEqual(ok({ usedBytes: 150_000, totalBytes: 200_000, percent: 75 }));
  });

  it('formats the uptime', () => {
    expect(readDashboardSummary().uptime).toEqual(ok('15d 14h 26m'));
  });

  it('maps the battery state', () => {
    expect(readDashboardSummary().battery).toEqual(
      ok({ percent: 39, charging: true, plugged: true }),
    );
  });

  it('treats an unplugged battery as not charging', () => {
    batteryMock.mockReturnValue(ok(reading({ status: 'discharging', plugged: 'none' })));
    expect(readDashboardSummary().battery).toEqual(
      ok({ percent: 39, charging: false, plugged: false }),
    );
  });

  it('keeps unavailable sections as unavailable', () => {
    storageMock.mockReturnValue(unavailable('Android did not return storage information.'));
    const summary = readDashboardSummary();
    expect(summary.storage).toEqual({
      status: 'unavailable',
      reason: 'Android did not return storage information.',
    });
  });

  it('reports missing internal storage as unavailable', () => {
    storageMock.mockReturnValue(ok({ internal: null, volumes: [] }));
    expect(readDashboardSummary().storage.status).toBe('unavailable');
  });

  it('propagates denied permissions', () => {
    memoryMock.mockReturnValue(denied('android.permission.READ_MEMORY'));
    expect(readDashboardSummary().memory).toEqual({
      status: 'denied',
      permission: 'android.permission.READ_MEMORY',
    });
  });
});

describe('batteryRingColor', () => {
  const colors = palettes.dark;

  it('is always good while charging', () => {
    expect(batteryRingColor(5, true, colors)).toBe(colors.good);
    expect(batteryRingColor(90, true, colors)).toBe(colors.good);
  });

  it('uses inverted thresholds on battery', () => {
    expect(batteryRingColor(10, false, colors)).toBe(colors.critical);
    expect(batteryRingColor(20, false, colors)).toBe(colors.warning);
    expect(batteryRingColor(50, false, colors)).toBe(colors.good);
  });
});
