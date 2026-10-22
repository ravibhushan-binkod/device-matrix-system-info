import type { CpuFrequency, CpuInfo, GpuInfo } from '@/core/native';
import { ok, unavailable } from '@/core/result';
import { resolveUnits } from '@/core/units/resolve';
import { DEFAULT_UNIT_PREFERENCES } from '@/core/units/types';
import {
  buildCoreBars,
  buildCpuScreenData,
  coreBarMaxKhz,
  formatAbiList,
  frequencyChartUnit,
  frequencyRange,
  governorSummary,
  groupCoreClusters,
} from '@/features/cpu/services/cpu-service';
import type { CpuCoreRow } from '@/features/cpu/types';

jest.mock('@/core/native', () => ({
  getCpuInfo: jest.fn(),
  getGpuInfo: jest.fn(),
}));

function frequency(overrides: Partial<CpuFrequency> = {}): CpuFrequency {
  return {
    index: 0,
    currentKhz: null,
    minKhz: null,
    maxKhz: null,
    governor: null,
    ...overrides,
  };
}

function cpu(overrides: Partial<CpuInfo> = {}): CpuInfo {
  return {
    cores: 8,
    abis: ['arm64-v8a', 'armeabi-v7a', 'armeabi'],
    socModel: 'Dimensity 7200 Pro',
    socManufacturer: 'MediaTek',
    hardware: 'mt6789',
    frequencies: [
      frequency({
        index: 0,
        currentKhz: 2_000_000,
        minKhz: 300_000,
        maxKhz: 2_200_000,
        governor: 'schedutil',
      }),
      frequency({ index: 1 }),
      frequency({ index: 2, currentKhz: 500_000 }),
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
  vulkanLevel: 1,
  vulkanCompute: true,
};

/**
 * `en-GB` resolves every `system` choice to the metric defaults, so the
 * frequency rows read in `auto` (GHz for chips that reach a gigahertz).
 */
const units = resolveUnits(DEFAULT_UNIT_PREFERENCES, 'en-GB');

describe('frequencyChartUnit', () => {
  it('honours a forced unit and scales `auto` from the chip top', () => {
    expect(frequencyChartUnit({ ...units, frequency: 'GHz' }, 900_000)).toBe('GHz');
    expect(frequencyChartUnit({ ...units, frequency: 'MHz' }, 2_200_000)).toBe('MHz');
    expect(frequencyChartUnit(units, 2_200_000)).toBe('GHz');
    expect(frequencyChartUnit(units, 900_000)).toBe('MHz');
  });
});

describe('buildCoreBars', () => {
  it('keeps only readable cores and formats each value in the chart unit', () => {
    expect(buildCoreBars(cpu(), 'GHz')).toEqual([
      { label: '0', value: 2, text: '2.00 GHz' },
      { label: '2', value: 0.5, text: '0.50 GHz' },
    ]);
    expect(buildCoreBars(cpu(), 'MHz')).toEqual([
      { label: '0', value: 2000, text: '2000 MHz' },
      { label: '2', value: 500, text: '500 MHz' },
    ]);
  });

  it('returns no bars when every read is blocked', () => {
    const blocked = cpu({ frequencies: [frequency()] });
    expect(buildCoreBars(blocked, 'GHz')).toEqual([]);
  });
});

describe('coreBarMaxKhz', () => {
  it('uses the highest reported maximum', () => {
    expect(coreBarMaxKhz(cpu())).toBe(2_200_000);
  });

  it('falls back to the current frequency and then a default', () => {
    const noMax = cpu({ frequencies: [frequency({ currentKhz: 1_800_000 })] });
    expect(coreBarMaxKhz(noMax)).toBe(1_800_000);
    const nothing = cpu({ frequencies: [] });
    expect(coreBarMaxKhz(nothing)).toBe(1_000_000);
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

describe('frequencyRange', () => {
  it('formats both bounds', () => {
    expect(frequencyRange(300_000, 2_200_000, units)).toBe('300 MHz – 2.20 GHz');
  });

  it('formats a single readable bound', () => {
    expect(frequencyRange(null, 2_200_000, units)).toBe('up to 2.20 GHz');
    expect(frequencyRange(300_000, null, units)).toBe('from 300 MHz');
  });

  it('returns null when nothing (or only zeros) was readable', () => {
    expect(frequencyRange(null, null, units)).toBeNull();
    expect(frequencyRange(0, 0, units)).toBeNull();
  });

  it('collapses equal bounds', () => {
    expect(frequencyRange(1_800_000, 1_800_000, units)).toBe('1.80 GHz');
  });

  it('follows a forced unit', () => {
    const mhz = { ...units, frequency: 'MHz' as const };
    expect(frequencyRange(300_000, 2_200_000, mhz)).toBe('300 MHz – 2200 MHz');
  });
});

describe('groupCoreClusters', () => {
  it('groups little, mid and big clusters by max frequency', () => {
    const frequencies = [
      frequency({ index: 0, maxKhz: 1_800_000 }),
      frequency({ index: 1, maxKhz: 1_800_000 }),
      frequency({ index: 2, maxKhz: 2_400_000 }),
      frequency({ index: 3, maxKhz: 2_400_000 }),
      frequency({ index: 4, maxKhz: 3_000_000 }),
      frequency({ index: 5, maxKhz: 3_000_000 }),
    ];
    expect(groupCoreClusters(frequencies)).toEqual([
      { key: 'cluster-1800000', label: 'Little', cores: [0, 1], maxKhz: 1_800_000 },
      { key: 'cluster-2400000', label: 'Mid', cores: [2, 3], maxKhz: 2_400_000 },
      { key: 'cluster-3000000', label: 'Big', cores: [4, 5], maxKhz: 3_000_000 },
    ]);
  });

  it('names a two-cluster layout little and big', () => {
    const clusters = groupCoreClusters([
      frequency({ index: 0, maxKhz: 1_800_000 }),
      frequency({ index: 1, maxKhz: 3_000_000 }),
    ]);
    expect(clusters.map((cluster) => cluster.label)).toEqual(['Little', 'Big']);
  });

  it('calls a single cluster covering every core "All cores"', () => {
    const clusters = groupCoreClusters([
      frequency({ index: 0, maxKhz: 2_000_000 }),
      frequency({ index: 1, maxKhz: 2_000_000 }),
    ]);
    expect(clusters).toEqual([
      { key: 'cluster-2000000', label: 'All cores', cores: [0, 1], maxKhz: 2_000_000 },
    ]);
  });

  it('keeps cores with a blocked maximum in an Unknown group', () => {
    const clusters = groupCoreClusters([
      frequency({ index: 0, maxKhz: 2_000_000 }),
      frequency({ index: 1 }),
      frequency({ index: 2 }),
    ]);
    expect(clusters).toEqual([
      { key: 'cluster-2000000', label: 'Cluster 1', cores: [0], maxKhz: 2_000_000 },
      { key: 'cluster-unknown', label: 'Unknown', cores: [1, 2], maxKhz: null },
    ]);
  });

  it('returns nothing for an empty core list', () => {
    expect(groupCoreClusters([])).toEqual([]);
  });
});

describe('governorSummary', () => {
  function row(governor: string | null): CpuCoreRow {
    return { key: '0', core: 'Core 0', cluster: null, current: null, range: null, governor };
  }

  it('lists each distinct governor once', () => {
    expect(governorSummary([row('schedutil'), row('schedutil'), row('performance')])).toBe(
      'schedutil · performance',
    );
  });

  it('returns null when no core reports one', () => {
    expect(governorSummary([row(null)])).toBeNull();
    expect(governorSummary([])).toBeNull();
  });
});

describe('buildCpuScreenData', () => {
  it('maps both readings', () => {
    const data = buildCpuScreenData(ok(cpu()), ok(gpu), units);
    expect(data.chipset).toBe('MediaTek Dimensity 7200 Pro');
    expect(data.socManufacturer).toBe('MediaTek');
    expect(data.socModel).toBe('Dimensity 7200 Pro');
    expect(data.hardware).toBe('mt6789');
    expect(data.cores).toBe(8);
    expect(data.abis).toBe('arm64-v8a · armeabi-v7a · armeabi');
    expect(data.governor).toBe('schedutil');
    expect(data.bars).toHaveLength(2);
    expect(data.barsMax).toBe(2.2);
    expect(data.barsUnit).toBe('GHz');
    expect(data.clusters.map((cluster) => cluster.label)).toEqual(['Cluster 1', 'Unknown']);
    expect(data.coreRows[0]).toEqual({
      key: '0',
      core: 'Core 0',
      cluster: 'Cluster 1',
      current: '2.00 GHz',
      range: '300 MHz – 2.20 GHz',
      governor: 'schedutil',
    });
    expect(data.coreRows[1]).toEqual({
      key: '1',
      core: 'Core 1',
      cluster: 'Unknown',
      current: null,
      range: null,
      governor: null,
    });
    expect(data.gpuRenderer).toBe('Mali-G610 MC4');
    expect(data.vulkanVersion).toBe('1.3');
    expect(data.vulkanLevel).toBe(1);
    expect(data.vulkanCompute).toBe(true);
  });

  it('scales the chart to a forced MHz axis', () => {
    const mhz = { ...units, frequency: 'MHz' as const };
    const data = buildCpuScreenData(ok(cpu()), ok(gpu), mhz);
    expect(data.barsUnit).toBe('MHz');
    expect(data.barsMax).toBe(2200);
    expect(data.coreRows[0]?.range).toBe('300 MHz – 2200 MHz');
  });

  it('leaves everything empty when both readings are unavailable', () => {
    const data = buildCpuScreenData(unavailable('no'), unavailable('no'), units);
    expect(data).toEqual({
      chipset: null,
      socManufacturer: null,
      socModel: null,
      hardware: null,
      cores: null,
      abis: null,
      governor: null,
      bars: [],
      barsMax: 1,
      barsUnit: 'GHz',
      clusters: [],
      coreRows: [],
      gpuRenderer: null,
      gpuVendor: null,
      glVersion: null,
      glEsVersion: null,
      vulkanVersion: null,
      vulkanLevel: null,
      vulkanCompute: null,
    });
  });
});
