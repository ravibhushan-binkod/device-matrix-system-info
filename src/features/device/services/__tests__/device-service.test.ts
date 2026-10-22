import {
  androidReleaseName,
  buildDeviceSections,
  estimateAge,
  firstApiReleaseMillis,
  formatAge,
  formatBuildDate,
  getLocaleInfo,
  selinuxLabel,
  type DeviceInfoInput,
} from '@/features/device/services/device-service';

jest.mock('@/core/native', () => ({
  getBuildInfo: jest.fn(),
  getOsInfo: jest.fn(),
  getUptime: jest.fn(),
}));

function emptyInput(overrides: Partial<DeviceInfoInput> = {}): DeviceInfoInput {
  return {
    brand: null,
    model: null,
    androidVersion: null,
    releaseName: null,
    apiLevel: null,
    securityPatch: null,
    buildId: null,
    buildTimeMillis: null,
    firstApiLevel: null,
    estimatedAge: null,
    playServices: null,
    selinuxMode: null,
    uptime: null,
    locale: null,
    timeZone: null,
    developerOptions: null,
    kernel: null,
    bootloader: null,
    hardware: null,
    board: null,
    product: null,
    codename: null,
    fingerprint: null,
    ...overrides,
  };
}

describe('buildDeviceSections', () => {
  it('builds the four sections in order', () => {
    const sections = buildDeviceSections(emptyInput());
    expect(sections.map((section) => section.key)).toEqual([
      'device',
      'android',
      'system',
      'kernel',
    ]);
    expect(sections[0]?.title).toBe('Device');
    expect(sections[1]?.title).toBe('Android');
    expect(sections[2]?.title).toBe('System');
    expect(sections[3]?.title).toBe('Kernel & boot');
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
        releaseName: null,
        apiLevel: 36,
        securityPatch: '2026-09-05',
        buildId: 'BP2A.250605.031',
        buildTimeMillis: Date.UTC(2025, 5, 5),
        firstApiLevel: 33,
        estimatedAge: '≈ 2 yr 2 mo · from build date',
        playServices: '25.40.32 (260)',
        selinuxMode: 'enforcing',
        uptime: '15d 14h 26m',
        locale: 'en-IN',
        timeZone: 'Asia/Kolkata',
        developerOptions: true,
        kernel: '5.15.149-android13',
        bootloader: 'unknown',
        hardware: 'mt6789',
        board: 'moonstone',
        product: 'A142',
        codename: 'moonstone',
        fingerprint: 'Nothing/A142/moonstone:16/...',
      }),
    );

    const entries = sections.flatMap((section) => section.entries);
    const valueOf = (key: string) => entries.find((entry) => entry.key === key)?.value;

    expect(valueOf('brand')).toBe('Nothing');
    expect(valueOf('model')).toBe('A142');
    expect(valueOf('android')).toBe('16');
    expect(valueOf('release')).toBeNull();
    expect(valueOf('api-level')).toBe('36');
    expect(valueOf('security-patch')).toBe('2026-09-05');
    expect(valueOf('build-id')).toBe('BP2A.250605.031');
    expect(valueOf('build-date')).toBe('2025-06-05');
    expect(valueOf('first-api')).toBe('33');
    expect(valueOf('age')).toBe('≈ 2 yr 2 mo · from build date');
    expect(valueOf('play-services')).toBe('25.40.32 (260)');
    expect(valueOf('selinux')).toBe('Enforcing');
    expect(valueOf('uptime')).toBe('15d 14h 26m');
    expect(valueOf('locale')).toBe('en-IN');
    expect(valueOf('time-zone')).toBe('Asia/Kolkata');
    expect(valueOf('developer-options')).toBe('On');
    expect(valueOf('kernel')).toBe('5.15.149-android13');
    expect(valueOf('bootloader')).toBe('unknown');
    expect(valueOf('hardware')).toBe('mt6789');
    expect(valueOf('board')).toBe('moonstone');
    expect(valueOf('product')).toBe('A142');
    expect(valueOf('codename')).toBe('moonstone');
  });

  it('reports developer options being off', () => {
    const sections = buildDeviceSections(emptyInput({ developerOptions: false }));
    const entry = sections[2]?.entries.find((item) => item.key === 'developer-options');
    expect(entry?.value).toBe('Off');
  });

  it('marks the kernel and fingerprint as multiline', () => {
    const sections = buildDeviceSections(emptyInput());
    const kernelSection = sections[3];
    const kernel = kernelSection?.entries.find((entry) => entry.key === 'kernel');
    const fingerprint = kernelSection?.entries.find((entry) => entry.key === 'fingerprint');
    expect(kernel?.multiline).toBe(true);
    expect(fingerprint?.multiline).toBe(true);
  });
});

describe('androidReleaseName', () => {
  it('maps the API levels that had public release names', () => {
    expect(androidReleaseName(21)).toBe('Lollipop');
    expect(androidReleaseName(28)).toBe('Pie');
  });

  it('returns null on Android 10+ and without an API level', () => {
    expect(androidReleaseName(29)).toBeNull();
    expect(androidReleaseName(36)).toBeNull();
    expect(androidReleaseName(null)).toBeNull();
  });
});

describe('formatBuildDate', () => {
  it('formats the build time as a plain UTC date', () => {
    expect(formatBuildDate(Date.UTC(2025, 5, 5))).toBe('2025-06-05');
  });

  it('returns null without a usable timestamp', () => {
    expect(formatBuildDate(null)).toBeNull();
    expect(formatBuildDate(0)).toBeNull();
    expect(formatBuildDate(-1)).toBeNull();
  });
});

describe('estimateAge', () => {
  const now = Date.UTC(2026, 0, 1);

  it('uses the build date when it is the only source', () => {
    expect(estimateAge(Date.UTC(2023, 0, 1), null, now)).toEqual({
      months: 36,
      source: 'build-date',
    });
  });

  it('falls back to the first release date of the API level', () => {
    expect(firstApiReleaseMillis(33)).toBe(Date.UTC(2022, 7, 15));
    expect(estimateAge(null, 33, now)).toEqual({ months: 40, source: 'release-date' });
  });

  it('keeps the older of the two dates', () => {
    expect(estimateAge(Date.UTC(2019, 0, 1), 33, now)).toEqual({
      months: 84,
      source: 'build-date',
    });
    expect(estimateAge(Date.UTC(2023, 0, 1), 33, now)).toEqual({
      months: 40,
      source: 'release-date',
    });
  });

  it('returns null without any usable date', () => {
    expect(estimateAge(null, null, now)).toBeNull();
    expect(estimateAge(0, 200, now)).toBeNull();
    expect(firstApiReleaseMillis(200)).toBeNull();
  });
});

describe('formatAge', () => {
  it('formats months and years with the basis', () => {
    expect(formatAge({ months: 36, source: 'build-date' })).toBe('≈ 3 yr · from build date');
    expect(formatAge({ months: 26, source: 'release-date' })).toBe(
      '≈ 2 yr 2 mo · from first Android release',
    );
    expect(formatAge({ months: 0, source: 'build-date' })).toBe('≈ 0 mo · from build date');
    expect(formatAge({ months: 11, source: 'release-date' })).toBe(
      '≈ 11 mo · from first Android release',
    );
  });

  it('returns null without an estimate', () => {
    expect(formatAge(null)).toBeNull();
  });
});

describe('selinuxLabel', () => {
  it('labels the kernel security mode', () => {
    expect(selinuxLabel('enforcing')).toBe('Enforcing');
    expect(selinuxLabel('permissive')).toBe('Permissive');
    expect(selinuxLabel(null)).toBeNull();
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
