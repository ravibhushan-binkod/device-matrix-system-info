import {
  buildReportHtml,
  buildReportSections,
  escapeHtml,
  REPORT_ESTIMATE_NOTE,
  REPORT_GROUPS,
  REPORT_UNAVAILABLE_NOTE,
  reportDateLabel,
  reportHeader,
  selectedReportGroups,
} from '@/features/report/services/report-service';

jest.mock('expo-application', () => ({
  nativeApplicationVersion: '1.0.0',
  nativeBuildVersion: '1',
}));

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
  getCameraInfo: jest.fn(),
  getConnectivityCapabilities: jest.fn(),
  getBluetoothInfo: jest.fn(),
  getNfcInfo: jest.fn(),
  getAppOverview: jest.fn(),
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

  it('uses a unique id per group and covers all fifteen sections', () => {
    const ids = REPORT_GROUPS.map((group) => group.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual([
      'device',
      'system',
      'cpu',
      'gpu',
      'memory',
      'storage',
      'battery',
      'thermal',
      'display',
      'camera',
      'sensors',
      'network',
      'connectivity',
      'apps',
      'testResults',
    ]);
  });
});

describe('buildReportSections', () => {
  it('returns no sections when nothing is picked', async () => {
    await expect(buildReportSections([])).resolves.toEqual([]);
  });
});

describe('reportHeader', () => {
  it('formats the local date, version and honesty notes', () => {
    expect(reportHeader(new Date(2026, 9, 19, 7, 5), '1.0.0 (1)')).toBe(
      [
        'Device Matrix: System Info — 2026-10-19 07:05',
        'App version 1.0.0 (1)',
        `${REPORT_UNAVAILABLE_NOTE} ${REPORT_ESTIMATE_NOTE}`,
      ].join('\n'),
    );
    expect(reportHeader(new Date(2026, 0, 1, 0, 0), null)).toBe(
      [
        'Device Matrix: System Info — 2026-01-01 00:00',
        `${REPORT_UNAVAILABLE_NOTE} ${REPORT_ESTIMATE_NOTE}`,
      ].join('\n'),
    );
  });

  it('formats the human date used by the PDF', () => {
    expect(reportDateLabel(new Date(2026, 9, 19, 7, 5))).toBe('19 Oct 2026, 07:05');
  });
});

describe('buildReportHtml', () => {
  const sections = [
    {
      title: 'Battery',
      entries: [
        { label: 'Level', value: '80%' },
        { label: 'Estimated age', value: '≈ 2 yr 2 mo' },
        { label: 'Kernel', value: null },
      ],
    },
  ];

  it('escapes markup that came from device values', () => {
    expect(escapeHtml('<script> & "quotes"')).toBe('&lt;script&gt; &amp; &quot;quotes&quot;');
    const html = buildReportHtml(
      [{ title: 'Notes', entries: [{ label: 'Value', value: '<script>alert(1)</script>' }] }],
      new Date(2026, 9, 19, 7, 5),
      '1.0.0 (1)',
    );
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('renders a branded light document with version, date and honest markers', () => {
    const html = buildReportHtml(sections, new Date(2026, 9, 19, 7, 5), '1.0.0 (1)');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Device Matrix');
    expect(html).toContain('Version 1.0.0 (1)');
    expect(html).toContain('19 Oct 2026, 07:05');
    expect(html).toContain('Battery');
    expect(html).toContain('80%');
    expect(html).toContain('Estimated');
    expect(html).toContain('Not available on this device');
    expect(html).toContain('Nothing was uploaded');
  });
});
