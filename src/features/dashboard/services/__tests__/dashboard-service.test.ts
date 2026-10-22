import type { BatteryReading, BuildInfo, CpuInfo } from '@/core/native';
import {
  getAppOverview,
  getBatteryInfo,
  getBluetoothInfo,
  getBuildInfo,
  getCameraInfo,
  getConnectivityCapabilities,
  getConnectivityInfo,
  getCpuInfo,
  getDeviceIdentity,
  getDisplayInfo,
  getMemoryInfo,
  getNfcInfo,
  getScreenTime,
  getSensors,
  getStorageInfo,
  getThermalStatus,
  getUptime,
  getWifiInfo,
  hasUsageAccess,
} from '@/core/native';
import { denied, ok, unavailable } from '@/core/result';
import { palettes } from '@/design-system/tokens';
import {
  batteryRingColor,
  readDashboardSummary,
} from '@/features/dashboard/services/dashboard-service';

jest.mock('@/core/native', () => ({
  getAppOverview: jest.fn(),
  getBatteryInfo: jest.fn(),
  getBluetoothInfo: jest.fn(),
  getBuildInfo: jest.fn(),
  getCameraInfo: jest.fn(),
  getConnectivityCapabilities: jest.fn(),
  getConnectivityInfo: jest.fn(),
  getCpuInfo: jest.fn(),
  getDeviceIdentity: jest.fn(),
  getDisplayInfo: jest.fn(),
  getMemoryInfo: jest.fn(),
  getNfcInfo: jest.fn(),
  getScreenTime: jest.fn(),
  getSensors: jest.fn(),
  getStorageInfo: jest.fn(),
  getThermalStatus: jest.fn(),
  getUptime: jest.fn(),
  getWifiInfo: jest.fn(),
  hasUsageAccess: jest.fn(),
}));

const identityMock = jest.mocked(getDeviceIdentity);
const uptimeMock = jest.mocked(getUptime);
const memoryMock = jest.mocked(getMemoryInfo);
const storageMock = jest.mocked(getStorageInfo);
const batteryMock = jest.mocked(getBatteryInfo);
const cpuMock = jest.mocked(getCpuInfo);
const buildMock = jest.mocked(getBuildInfo);
const thermalMock = jest.mocked(getThermalStatus);

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
    ok({
      totalBytes: 8_000,
      availableBytes: 3_000,
      thresholdBytes: 100,
      lowMemory: false,
      swapTotalBytes: null,
      swapFreeBytes: null,
      swapCachedBytes: null,
    }),
  );
  storageMock.mockReturnValue(
    ok({ internal: { totalBytes: 200_000, freeBytes: 50_000, fsType: 'f2fs' }, volumes: [] }),
  );
  batteryMock.mockReturnValue(ok(reading()));
  cpuMock.mockReturnValue(unavailable('Not mocked.'));
  buildMock.mockReturnValue(unavailable('Not mocked.'));
  thermalMock.mockReturnValue(unavailable('Not mocked.'));
  jest.mocked(getAppOverview).mockResolvedValue(unavailable('Not mocked.'));
  jest.mocked(getBluetoothInfo).mockReturnValue(unavailable('Not mocked.'));
  jest.mocked(getCameraInfo).mockReturnValue(unavailable('Not mocked.'));
  jest.mocked(getConnectivityCapabilities).mockReturnValue(unavailable('Not mocked.'));
  jest.mocked(getConnectivityInfo).mockReturnValue(unavailable('Not mocked.'));
  jest.mocked(getDisplayInfo).mockReturnValue(unavailable('Not mocked.'));
  jest.mocked(getNfcInfo).mockReturnValue(unavailable('Not mocked.'));
  jest.mocked(getScreenTime).mockResolvedValue(unavailable('Not mocked.'));
  jest.mocked(getSensors).mockReturnValue(unavailable('Not mocked.'));
  jest.mocked(getWifiInfo).mockReturnValue(unavailable('Not mocked.'));
  jest.mocked(hasUsageAccess).mockReturnValue(unavailable('Not mocked.'));
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
      ok({
        percent: 39,
        charging: true,
        plugged: true,
        watts: 2.6,
        temperatureC: 38,
        health: 'good',
        status: 'charging',
      }),
    );
  });

  it('treats an unplugged battery as not charging', () => {
    batteryMock.mockReturnValue(ok(reading({ status: 'discharging', plugged: 'none' })));
    expect(readDashboardSummary().battery).toEqual(
      ok({
        percent: 39,
        charging: false,
        plugged: false,
        watts: 2.6,
        temperatureC: 38,
        health: 'good',
        status: 'discharging',
      }),
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

  it('maps live CPU clocks without inventing missing samples', () => {
    cpuMock.mockReturnValue(
      ok<CpuInfo>({
        cores: 4,
        abis: ['arm64-v8a'],
        socModel: 'Tensor G3',
        socManufacturer: 'Google',
        hardware: 'zuma',
        frequencies: [
          {
            index: 0,
            currentKhz: 1_800_000,
            minKhz: 300_000,
            maxKhz: 2_800_000,
            governor: 'schedutil',
          },
          { index: 1, currentKhz: null, minKhz: 300_000, maxKhz: 2_900_000, governor: 'schedutil' },
          {
            index: 2,
            currentKhz: 2_400_000,
            minKhz: 300_000,
            maxKhz: 2_900_000,
            governor: 'schedutil',
          },
        ],
      }),
    );
    const cpu = readDashboardSummary().cpu;
    expect(cpu.status).toBe('ok');
    if (cpu.status !== 'ok') throw new Error('expected cpu to be available');
    expect(cpu.value.cores).toBe(4);
    expect(cpu.value.averageMhz).toBe(2_100);
    expect(cpu.value.peakMhz).toBe(2_400);
    expect(cpu.value.maxMhz).toBe(2_900);
    expect(cpu.value.liveCoresMhz).toEqual([1_800, 2_400]);
  });

  it('derives device facts from the build values', () => {
    buildMock.mockReturnValue(
      ok<BuildInfo>({
        brand: 'Google',
        model: 'Pixel 8',
        manufacturer: 'Google',
        board: 'shiba',
        product: 'shiba',
        device: 'shiba',
        hardware: 'zuma',
        bootloader: 'unknown',
        buildId: 'AP1A',
        fingerprint: null,
        securityPatch: '2026-09-05',
        buildTimeMillis: new Date(2026, 8, 10).getTime(),
        androidVersion: '16',
        apiLevel: 36,
        firstApiLevel: 34,
      }),
    );
    const summary = readDashboardSummary();
    expect(summary.facts.status).toBe('ok');
    if (summary.facts.status !== 'ok') throw new Error('expected facts to be available');
    expect(summary.facts.value.securityPatch).toBe('2026-09-05');
    expect(summary.facts.value.buildDateLabel).toBe('10 Sep 2026');
    expect(summary.facts.value.firstApiLevel).toBe(34);
    expect(summary.health.checks.find((check) => check.id === 'security')?.available).toBe(true);
  });

  it('maps thermal headroom and the battery temperature', () => {
    thermalMock.mockReturnValue(
      ok({ status: 'light', statusCode: 1, headroom: 0.42, headroomForecastSeconds: 60 }),
    );
    const thermal = readDashboardSummary().thermal;
    expect(thermal).toEqual(
      ok({
        status: 'light',
        statusLabel: 'Light',
        loadPercent: 58,
        headroomPercent: 42,
        temperatureC: 38,
      }),
    );
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
