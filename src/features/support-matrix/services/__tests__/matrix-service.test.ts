import { unavailable } from '@/core/result';
import {
  buildSupportMatrix,
  summarizeMatrix,
} from '@/features/support-matrix/services/matrix-service';
import type { MatrixSection } from '@/features/support-matrix/types';

jest.mock('@/core/native', () => ({
  getBatteryInfo: jest.fn(),
  getBuildInfo: jest.fn(),
  getCameraInfo: jest.fn(),
  getCpuInfo: jest.fn(),
  getDisplayInfo: jest.fn(),
  getGpuInfo: jest.fn(),
  getMemoryInfo: jest.fn(),
  getOsInfo: jest.fn(),
  getSensors: jest.fn(),
  getStorageInfo: jest.fn(),
  getStorageStats: jest.fn(),
  getThermalStatus: jest.fn(),
  getUptime: jest.fn(),
  hasUsageAccess: jest.fn(),
}));

const native = jest.requireMock('@/core/native') as Record<string, jest.Mock>;

beforeEach(() => {
  for (const fn of Object.values(native)) {
    fn.mockReset();
    fn.mockReturnValue(unavailable('Blocked on this device.'));
  }
});

describe('buildSupportMatrix', () => {
  it('lists every section with honest rows when the device blocks everything', async () => {
    const sections = await buildSupportMatrix();
    expect(sections.map((section) => section.key)).toEqual([
      'device',
      'cpu',
      'thermal',
      'battery',
      'memory',
      'storage',
      'display',
      'camera',
      'sensors',
      'gaps',
    ]);

    const summary = summarizeMatrix(sections);
    // Locale and time zone come from the JS engine (Intl), so they stay readable.
    expect(summary.ok).toBe(2);
    expect(summary.unavailable).toBeGreaterThan(20);

    for (const section of sections) {
      for (const item of section.entries) {
        if (item.value == null) expect(item.note).not.toBeNull();
      }
    }
  });
});

describe('summarizeMatrix', () => {
  it('counts available and unavailable readings', () => {
    const sections: MatrixSection[] = [
      {
        key: 'a',
        title: 'A',
        entries: [
          { key: '1', label: 'One', value: 'x', note: null },
          { key: '2', label: 'Two', value: null, note: 'nope' },
        ],
      },
      {
        key: 'b',
        title: 'B',
        entries: [
          { key: '3', label: 'Three', value: 'y', note: null },
          { key: '4', label: 'Four', value: null, note: 'nope' },
          { key: '5', label: 'Five', value: null, note: 'nope' },
        ],
      },
    ];
    expect(summarizeMatrix(sections)).toEqual({ ok: 2, unavailable: 3 });
  });

  it('handles an empty matrix', () => {
    expect(summarizeMatrix([])).toEqual({ ok: 0, unavailable: 0 });
  });
});
