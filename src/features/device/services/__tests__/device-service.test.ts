import {
  buildDeviceSections,
  getLocaleInfo,
  type DeviceInfoInput,
} from '@/features/device/services/device-service';

jest.mock('@/core/native', () => ({
  getDeviceBuildInfo: jest.fn(),
  getDeviceIdentity: jest.fn(),
  getOsInfo: jest.fn(),
  getUptime: jest.fn(),
}));

function emptyInput(overrides: Partial<DeviceInfoInput> = {}): DeviceInfoInput {
  return {
    brand: null,
    model: null,
    androidVersion: null,
    apiLevel: null,
    securityPatch: null,
    buildId: null,
    uptime: null,
    locale: null,
    timeZone: null,
    developerOptions: null,
    kernel: null,
    bootloader: null,
    hardware: null,
    fingerprint: null,
    ...overrides,
  };
}

describe('buildDeviceSections', () => {
  it('builds the three sections in order', () => {
    const sections = buildDeviceSections(emptyInput());
    expect(sections.map((section) => section.key)).toEqual(['device', 'os', 'kernel']);
    expect(sections[0]?.title).toBe('Device');
    expect(sections[1]?.title).toBe('OS');
    expect(sections[2]?.title).toBe('Kernel & boot');
  });

  it('keeps every missing reading as null', () => {
    for (const section of buildDeviceSections(emptyInput())) {
      for (const entry of section.entries) {
        expect(entry.value).toBeNull();
      }
    }
  });

  it('formats values', () => {
    const sections = buildDeviceSections(
      emptyInput({
        brand: 'nothing',
        model: 'A142',
        androidVersion: '16',
        apiLevel: 36,
        securityPatch: '2026-09-05',
        buildId: 'BP2A.250605.031',
        uptime: '15d 14h 26m',
        locale: 'en-IN',
        timeZone: 'Asia/Kolkata',
        developerOptions: true,
        kernel: '5.15.149-android13',
        bootloader: 'unknown',
        hardware: 'mt6789',
        fingerprint: 'Nothing/A142/moonstone:16/...',
      }),
    );

    const entries = sections.flatMap((section) => section.entries);
    const valueOf = (key: string) => entries.find((entry) => entry.key === key)?.value;

    expect(valueOf('brand')).toBe('Nothing');
    expect(valueOf('model')).toBe('A142');
    expect(valueOf('android')).toBe('16');
    expect(valueOf('api-level')).toBe('36');
    expect(valueOf('security-patch')).toBe('2026-09-05');
    expect(valueOf('build-id')).toBe('BP2A.250605.031');
    expect(valueOf('uptime')).toBe('15d 14h 26m');
    expect(valueOf('locale')).toBe('en-IN');
    expect(valueOf('time-zone')).toBe('Asia/Kolkata');
    expect(valueOf('developer-options')).toBe('On');
    expect(valueOf('kernel')).toBe('5.15.149-android13');
    expect(valueOf('bootloader')).toBe('unknown');
    expect(valueOf('hardware')).toBe('mt6789');
  });

  it('reports developer options being off', () => {
    const sections = buildDeviceSections(emptyInput({ developerOptions: false }));
    const entry = sections[1]?.entries.find((item) => item.key === 'developer-options');
    expect(entry?.value).toBe('Off');
  });

  it('marks the kernel and fingerprint as multiline', () => {
    const sections = buildDeviceSections(emptyInput());
    const kernelSection = sections[2];
    const kernel = kernelSection?.entries.find((entry) => entry.key === 'kernel');
    const fingerprint = kernelSection?.entries.find((entry) => entry.key === 'fingerprint');
    expect(kernel?.multiline).toBe(true);
    expect(fingerprint?.multiline).toBe(true);
  });
});

describe('getLocaleInfo', () => {
  it('reads the locale and time zone from Intl', () => {
    const info = getLocaleInfo();
    expect(info.locale).toEqual(expect.any(String));
    expect(info.locale?.length).toBeGreaterThan(0);
    expect(info.timeZone).toEqual(expect.any(String));
    expect(info.timeZone?.length).toBeGreaterThan(0);
  });
});
