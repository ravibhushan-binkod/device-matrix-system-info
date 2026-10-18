import type { CpuInfo, GpuInfo } from '@/core/native';
import { ok, unavailable } from '@/core/result';
import {
  buildCoreBars,
  buildCpuScreenData,
  coreBarMaxMhz,
  formatAbiList,
} from '@/features/cpu/services/cpu-service';

jest.mock('@/core/native', () => ({
  getCpuInfo: jest.fn(),
  getGpuInfo: jest.fn(),
}));

function cpu(overrides: Partial<CpuInfo> = {}): CpuInfo {
  return {
    cores: 8,
    abis: ['arm64-v8a', 'armeabi-v7a', 'armeabi'],
    socModel: 'Dimensity 7200 Pro',
    socManufacturer: 'MediaTek',
    hardware: 'mt6789',
    frequencies: [
      { index: 0, currentKhz: 2_000_000, maxKhz: 2_200_000 },
      { index: 1, currentKhz: null, maxKhz: null },
      { index: 2, currentKhz: 500_000, maxKhz: null },
    ],
    ...overrides,
  };
}

const gpu: GpuInfo = {
  renderer: 'Mali-G610 MC4',
  vendor: 'ARM',
  glVersion: 'OpenGL ES 3.2',
  glEsVersion: '3.2',
  vulkanVersion: '1.3',
};

describe('buildCoreBars', () => {
  it('keeps only readable cores and formats each value', () => {
    expect(buildCoreBars(cpu())).toEqual([
      { label: '0', value: 2000, text: '2.00 GHz' },
      { label: '2', value: 500, text: '500 MHz' },
    ]);
  });

  it('returns no bars when every read is blocked', () => {
    const blocked = cpu({
      frequencies: [{ index: 0, currentKhz: null, maxKhz: null }],
    });
    expect(buildCoreBars(blocked)).toEqual([]);
  });
});

describe('coreBarMaxMhz', () => {
  it('uses the highest reported maximum', () => {
    expect(coreBarMaxMhz(cpu())).toBe(2200);
  });

  it('falls back to the current frequency and then a default', () => {
    const noMax = cpu({
      frequencies: [{ index: 0, currentKhz: 1_800_000, maxKhz: null }],
    });
    expect(coreBarMaxMhz(noMax)).toBe(1800);
    const nothing = cpu({ frequencies: [] });
    expect(coreBarMaxMhz(nothing)).toBe(100);
  });
});

describe('formatAbiList', () => {
  it('joins the ABIs', () => {
    expect(formatAbiList(['arm64-v8a', 'armeabi-v7a'])).toBe('arm64-v8a · armeabi-v7a');
  });

  it('filters empty entries and returns null when nothing is left', () => {
    expect(formatAbiList([])).toBeNull();
    expect(formatAbiList(['', ''])).toBeNull();
  });
});

describe('buildCpuScreenData', () => {
  it('maps both readings', () => {
    const data = buildCpuScreenData(ok(cpu()), ok(gpu));
    expect(data.chipset).toBe('MediaTek Dimensity 7200 Pro');
    expect(data.cores).toBe(8);
    expect(data.abis).toBe('arm64-v8a · armeabi-v7a · armeabi');
    expect(data.bars).toHaveLength(2);
    expect(data.barsMaxMhz).toBe(2200);
    expect(data.gpuRenderer).toBe('Mali-G610 MC4');
    expect(data.vulkanVersion).toBe('1.3');
  });

  it('leaves everything empty when both readings are unavailable', () => {
    const data = buildCpuScreenData(unavailable('no'), unavailable('no'));
    expect(data).toEqual({
      chipset: null,
      cores: null,
      abis: null,
      bars: [],
      barsMaxMhz: 100,
      gpuRenderer: null,
      gpuVendor: null,
      glVersion: null,
      glEsVersion: null,
      vulkanVersion: null,
    });
  });
});
