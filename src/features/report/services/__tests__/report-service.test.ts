import {
  buildReportHtml,
  escapeHtml,
  REPORT_GROUPS,
  reportHeader,
  selectedReportGroups,
} from '@/features/report/services/report-service';

jest.mock('@/core/storage/mmkv', () => ({
  getString: jest.fn(() => undefined),
  setString: jest.fn(),
}));

jest.mock('@/core/native', () => ({
  getBatteryInfo: jest.fn(),
  getConnectivityInfo: jest.fn(),
  getCpuInfo: jest.fn(),
  getGpuInfo: jest.fn(),
  getSensors: jest.fn(),
  getStorageInfo: jest.fn(),
  getWifiInfo: jest.fn(),
  getDisplayInfo: jest.fn(),
  getMemoryInfo: jest.fn(),
  getDeviceBuildInfo: jest.fn(),
  getDeviceIdentity: jest.fn(),
  getOsInfo: jest.fn(),
  getUptime: jest.fn(),
  getThermalStatus: jest.fn(),
}));

describe('selectedReportGroups', () => {
  it('keeps the catalog order regardless of pick order', () => {
    expect(selectedReportGroups(['memory', 'device']).map((group) => group.id)).toEqual([
      'device',
      'memory',
    ]);
  });

  it('returns an empty list when nothing is picked', () => {
    expect(selectedReportGroups([])).toEqual([]);
  });

  it('uses a unique id per group', () => {
    const ids = REPORT_GROUPS.map((group) => group.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('device');
    expect(ids).toContain('sensors');
    expect(ids).toContain('hardwareTests');
  });
});

describe('reportHeader', () => {
  it('formats the local date and time', () => {
    expect(reportHeader(new Date(2026, 9, 19, 7, 5))).toBe(
      'Device Matrix: System info — 2026-10-19 07:05',
    );
    expect(reportHeader(new Date(2026, 0, 1, 0, 0))).toBe(
      'Device Matrix: System info — 2026-01-01 00:00',
    );
  });
});

describe('buildReportHtml', () => {
  it('escapes markup that came from device values', () => {
    expect(escapeHtml('<script> & "quotes"')).toBe('&lt;script&gt; &amp; &quot;quotes&quot;');
    const html = buildReportHtml('<script>alert(1)</script>');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('wraps the text in a printable document', () => {
    const html = buildReportHtml('Device Matrix\n- Level: 80%');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Device Matrix');
    expect(html).toContain('<pre>');
  });
});
