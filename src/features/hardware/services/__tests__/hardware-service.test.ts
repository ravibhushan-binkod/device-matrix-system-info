import type {
  BatteryReading,
  CameraDescriptor,
  CameraInfo,
  CpuInfo,
  DeviceIdentity,
  DisplayInfo,
  MemoryInfo,
  SensorDescriptor,
  StorageInfo,
  ThermalStatus,
} from '@/core/native';
import { ok, unavailable, type Result } from '@/core/result';
import {
  buildHubEntries,
  type HardwareSummary,
} from '@/features/hardware/services/hardware-service';
import type { HubKey } from '@/features/hardware/types';

jest.mock('@/core/native', () => ({
  getBatteryInfo: jest.fn(),
  getCameraInfo: jest.fn(),
  getCpuInfo: jest.fn(),
  getDeviceIdentity: jest.fn(),
  getDisplayInfo: jest.fn(),
  getMemoryInfo: jest.fn(),
  getSensors: jest.fn(),
  getStorageInfo: jest.fn(),
  getThermalStatus: jest.fn(),
}));

const identity: DeviceIdentity = {
  brand: 'nothing',
  model: 'A142',
  androidVersion: '16',
  apiLevel: 36,
};

const cpu: CpuInfo = {
  cores: 8,
  abis: ['arm64-v8a', 'armeabi-v7a'],
  socModel: 'Dimensity 7200 Pro',
  socManufacturer: 'MediaTek',
  hardware: 'mt6789',
  frequencies: [],
};

const memory: MemoryInfo = {
  totalBytes: 8_000_000_000,
  availableBytes: 2_000_000_000,
  thresholdBytes: 300_000_000,
  lowMemory: false,
  swapTotalBytes: null,
  swapFreeBytes: null,
  swapCachedBytes: null,
};

const storage: StorageInfo = {
  internal: { totalBytes: 128_000_000_000, freeBytes: 59_000_000_000, fsType: 'f2fs' },
  volumes: [],
};

const battery: BatteryReading = {
  level: 61,
  percent: 61,
  status: 'charging',
  plugged: 'usb',
  health: 'good',
  temperatureC: 40,
  voltageMv: 4050,
  technology: 'Li-ion',
  currentNowUa: 350_000,
  chargeCounterUah: 2_500_000,
  cycleCount: null,
  powerSave: false,
};

const thermal: ThermalStatus = {
  status: 'none',
  statusCode: 0,
  headroom: 0.72,
  headroomForecastSeconds: 10,
};

const display: DisplayInfo = {
  widthPx: 1084,
  heightPx: 2412,
  densityDpi: 399,
  density: 2.49,
  xdpi: 398,
  ydpi: 400,
  refreshRateHz: 120,
  supportedModes: [],
  isHdr: true,
  hdrTypes: ['HDR10'],
  isWideColorGamut: true,
  cutout: null,
  brightness: 128,
  brightnessMode: 'manual',
  screenTimeoutMs: 30_000,
};

function descriptor(overrides: Partial<CameraDescriptor> = {}): CameraDescriptor {
  return {
    id: '0',
    facing: 'back',
    megapixels: null,
    sensorWidthPx: null,
    sensorHeightPx: null,
    sensorPhysicalWidthMm: null,
    sensorPhysicalHeightMm: null,
    aperture: null,
    apertures: null,
    focalLengthMm: null,
    focalLengthsMm: null,
    isoMin: null,
    isoMax: null,
    exposureMinNs: null,
    exposureMaxNs: null,
    minFocusDistance: null,
    maxDigitalZoom: null,
    rawSupport: null,
    videoSizes: null,
    fpsRanges: null,
    hardwareLevel: null,
    physicalCameraIds: null,
    flash: false,
    opticalStabilization: null,
    videoStabilization: null,
    ...overrides,
  };
}

const camera: CameraInfo = {
  cameras: [
    descriptor({
      id: '0',
      facing: 'back',
      megapixels: 49.9,
      aperture: 1.88,
      focalLengthMm: 25,
      flash: true,
      opticalStabilization: true,
      videoStabilization: true,
    }),
    descriptor({
      id: '1',
      facing: 'front',
      megapixels: 32,
      aperture: 2.2,
      focalLengthMm: 24,
      flash: false,
      opticalStabilization: false,
      videoStabilization: true,
    }),
  ],
};

const sensors: SensorDescriptor[] = [
  {
    type: 1,
    name: 'Accelerometer',
    vendor: 'Bosch',
    version: 1,
    stringType: 'android.sensor.accelerometer',
    maxRange: 78.45,
    resolution: 0.002,
    powerMa: 0.15,
    minDelayUs: 5000,
    maxDelayUs: null,
    fifoMaxEventCount: null,
    fifoReservedEventCount: null,
    isWakeUp: true,
    reportingMode: 'continuous',
  },
];

function okSummary(): HardwareSummary {
  return {
    identity: ok(identity),
    cpu: ok(cpu),
    thermal: ok(thermal),
    memory: ok(memory),
    storage: ok(storage),
    battery: ok(battery),
    display: ok(display),
    camera: ok(camera),
    sensors: ok(sensors),
  };
}

function entryOf(summary: HardwareSummary, key: HubKey) {
  return buildHubEntries(summary).find((entry) => entry.key === key);
}

describe('buildHubEntries', () => {
  it('lists every area in order', () => {
    const keys = buildHubEntries(okSummary()).map((entry) => entry.key);
    expect(keys).toEqual([
      'device',
      'cpu',
      'thermal',
      'memory',
      'storage',
      'battery',
      'display',
      'camera',
      'sensors',
    ]);
  });

  it('formats live values and captions', () => {
    const summary = okSummary();
    expect(entryOf(summary, 'device')).toEqual({
      key: 'device',
      title: 'Device & OS',
      value: 'Nothing A142',
      caption: 'Android 16',
    });
    expect(entryOf(summary, 'cpu')).toEqual({
      key: 'cpu',
      title: 'CPU & GPU',
      value: '8 cores',
      caption: 'MediaTek Dimensity 7200 Pro',
    });
    expect(entryOf(summary, 'thermal')).toEqual({
      key: 'thermal',
      title: 'Thermal',
      value: 'Normal',
      caption: 'Headroom 72%',
    });
    expect(entryOf(summary, 'memory')).toMatchObject({ value: '75%', caption: '2.0 GB free' });
    expect(entryOf(summary, 'storage')).toMatchObject({ value: '54%', caption: '59.0 GB free' });
    expect(entryOf(summary, 'battery')).toMatchObject({ value: '61%', caption: 'Charging' });
    expect(entryOf(summary, 'display')).toMatchObject({
      value: '1084 × 2412',
      caption: '120 Hz',
    });
    expect(entryOf(summary, 'camera')).toMatchObject({
      value: '2 cameras',
      caption: '1 back · 1 front',
    });
    expect(entryOf(summary, 'sensors')).toMatchObject({ value: '1 sensor', caption: null });
  });

  it('shows a dash and no caption when readings are unavailable', () => {
    const summary: HardwareSummary = {
      identity: unavailable('no'),
      cpu: unavailable('no'),
      thermal: unavailable('no'),
      memory: unavailable('no'),
      storage: unavailable('no'),
      battery: unavailable('no'),
      display: unavailable('no'),
      camera: unavailable('no'),
      sensors: unavailable('no'),
    };
    for (const entry of buildHubEntries(summary)) {
      expect(entry.value).toBe('—');
      expect(entry.caption).toBeNull();
    }
  });

  it('keeps battery captions honest for unplugged states', () => {
    const discharging: Result<BatteryReading> = ok({
      ...battery,
      status: 'discharging',
      plugged: 'none',
    });
    const summary = { ...okSummary(), battery: discharging };
    expect(entryOf(summary, 'battery')?.caption).toBe('On battery');
  });
});
