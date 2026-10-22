import { IDENTIFYING_HIDDEN } from '@/core/utils/report-text';
import {
  buildReportHtml,
  buildReportSections,
  escapeHtml,
  maskIdentifyingSections,
  REPORT_ESTIMATE_NOTE,
  REPORT_GROUPS,
  REPORT_PRIVACY_NOTE,
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
  it('formats the local date, version, honesty notes and the privacy note', () => {
    expect(reportHeader(new Date(2026, 9, 19, 7, 5), '1.0.0 (1)')).toBe(
      [
        'Device Matrix: System Info — 2026-10-19 07:05',
        'App version 1.0.0 (1)',
        `${REPORT_UNAVAILABLE_NOTE} ${REPORT_ESTIMATE_NOTE}`,
        REPORT_PRIVACY_NOTE,
      ].join('\n'),
    );
    expect(reportHeader(new Date(2026, 0, 1, 0, 0), null)).toBe(
      [
        'Device Matrix: System Info — 2026-01-01 00:00',
        `${REPORT_UNAVAILABLE_NOTE} ${REPORT_ESTIMATE_NOTE}`,
        REPORT_PRIVACY_NOTE,
      ].join('\n'),
    );
    expect(reportHeader(new Date(2026, 0, 1, 0, 0), null, true)).toBe(
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
    expect(html).toContain(escapeHtml(REPORT_PRIVACY_NOTE));
  });

  it('leaves the privacy note out when identifying details were included', () => {
    const html = buildReportHtml(sections, new Date(2026, 9, 19, 7, 5), '1.0.0 (1)', true);
    expect(html).not.toContain(escapeHtml(REPORT_PRIVACY_NOTE));
  });
});

describe('maskIdentifyingSections', () => {
  const sections = [
    {
      title: 'Network',
      entries: [
        { label: 'IP address', value: '192.168.1.24 / fe80::1' },
        { label: 'Gateway', value: '192.168.1.1' },
        { label: 'DNS', value: '192.168.1.1' },
        { label: 'Link speed', value: '866 Mbps' },
        { label: 'Gateway', value: null },
      ],
    },
    {
      title: 'Kernel & boot',
      entries: [{ label: 'Fingerprint', value: 'Nothing/A142/moonstone:16' }],
    },
  ];

  it('replaces only the identifying values', () => {
    const masked = maskIdentifyingSections(sections);
    expect(masked[0]?.entries.map((entry) => entry.value)).toEqual([
      IDENTIFYING_HIDDEN,
      IDENTIFYING_HIDDEN,
      IDENTIFYING_HIDDEN,
      '866 Mbps',
      null,
    ]);
    expect(masked[1]?.entries[0]?.value).toBe(IDENTIFYING_HIDDEN);
    expect(masked[0]?.title).toBe('Network');
  });

  it('keeps the original sections untouched', () => {
    maskIdentifyingSections(sections);
    expect(sections[0]?.entries[0]?.value).toBe('192.168.1.24 / fe80::1');
  });
});
