import {
  detectBrands,
  detectGpuBrand,
  detectPhoneBrand,
  detectPlatformBrand,
  detectSocBrand,
  initialsFor,
  type BrandInput,
  type BrandMark,
} from '@/core/brand/detect-brand';

const base: BrandInput = {
  manufacturer: null,
  brand: null,
  socManufacturer: null,
  socModel: null,
  hardware: null,
  gpuRenderer: null,
  gpuVendor: null,
  androidVersion: null,
};

/** The slug of a logo mark, or `null` for a badge (narrows the union). */
function logoSlug(mark: BrandMark | null): string | null {
  return mark != null && mark.kind === 'logo' ? mark.slug : null;
}

/** The letters of an initials badge, or `null` for a logo. */
function badgeInitials(mark: BrandMark | null): string | null {
  return mark != null && mark.kind === 'initials' ? mark.initials : null;
}

describe('initialsFor', () => {
  it('uses two letters of one word and initials of two words', () => {
    expect(initialsFor('Exynos')).toBe('EX');
    expect(initialsFor('Adreno')).toBe('AD');
    expect(initialsFor('Google Tensor')).toBe('GT');
    expect(initialsFor('PowerVR Rogue')).toBe('PR');
  });

  it('ignores model numbers', () => {
    expect(initialsFor('Exynos 2400')).toBe('EX');
    expect(initialsFor('Tensor G3')).toBe('TE');
    expect(initialsFor('Dimensity 9300')).toBe('DI');
  });

  it('never returns an empty badge', () => {
    expect(initialsFor('')).toBe('?');
  });
});

describe('detectPhoneBrand', () => {
  it('maps the real makers Android reports', () => {
    expect(detectPhoneBrand({ ...base, manufacturer: 'samsung', brand: 'samsung' })).toEqual({
      kind: 'logo',
      slug: 'samsung',
      name: 'Samsung',
    });
    expect(detectPhoneBrand({ ...base, manufacturer: 'Google', brand: 'google' })).toEqual({
      kind: 'logo',
      slug: 'google',
      name: 'Google',
    });
    expect(detectPhoneBrand({ ...base, manufacturer: 'nothing', brand: 'Nothing' })).toEqual({
      kind: 'initials',
      initials: 'NO',
      name: 'Nothing',
    });
  });

  it('normalises sub-brands to their maker', () => {
    expect(detectPhoneBrand({ ...base, manufacturer: 'Xiaomi', brand: 'Redmi' })?.name).toBe(
      'Xiaomi',
    );
    expect(detectPhoneBrand({ ...base, manufacturer: 'vivo', brand: 'iQOO' })?.name).toBe('Vivo');
    expect(detectPhoneBrand({ ...base, manufacturer: 'ZTE', brand: 'nubia' })?.name).toBe('Nubia');
  });

  it('returns null when Android reports nothing usable', () => {
    expect(detectPhoneBrand(base)).toBeNull();
    expect(detectPhoneBrand({ ...base, manufacturer: 'unknown', brand: 'unknown' })).toBeNull();
  });

  it('falls back to a neutral badge for an unknown maker', () => {
    expect(detectPhoneBrand({ ...base, manufacturer: 'Acme', brand: 'Acme Phone' })).toEqual({
      kind: 'initials',
      initials: 'AC',
      name: 'Acme',
    });
  });
});

describe('detectPlatformBrand', () => {
  it('shows Android for a normal release version', () => {
    expect(detectPlatformBrand({ ...base, androidVersion: '14' })).toEqual({
      kind: 'logo',
      slug: 'android',
      name: 'Android 14',
    });
  });

  it('shows HarmonyOS when the build reports it', () => {
    expect(detectPlatformBrand({ ...base, androidVersion: 'HarmonyOS 4.2' })).toEqual({
      kind: 'logo',
      slug: 'harmonyos',
      name: 'HarmonyOS',
    });
  });

  it('returns null when no version is reported', () => {
    expect(detectPlatformBrand(base)).toBeNull();
  });
});

describe('detectSocBrand', () => {
  it('maps Qualcomm identifiers', () => {
    expect(detectSocBrand({ ...base, socManufacturer: 'Qualcomm', socModel: 'SM8650' })).toEqual({
      kind: 'logo',
      slug: 'qualcomm',
      name: 'Qualcomm',
    });
    expect(detectSocBrand({ ...base, hardware: 'qcom' })?.name).toBe('Qualcomm');
    expect(detectSocBrand({ ...base, socModel: 'Snapdragon 8 Gen 3' })?.name).toBe('Qualcomm');
  });

  it('maps MediaTek identifiers', () => {
    expect(
      detectSocBrand({ ...base, socManufacturer: 'MediaTek', socModel: 'Dimensity 9300' }),
    ).toEqual({ kind: 'logo', slug: 'mediatek', name: 'MediaTek' });
    expect(detectSocBrand({ ...base, hardware: 'mt6886' })?.name).toBe('MediaTek');
    expect(detectSocBrand({ ...base, socModel: 'Helio G99' })?.name).toBe('MediaTek');
  });

  it('gives Exynos, Tensor and Kirin neutral badges', () => {
    expect(
      detectSocBrand({ ...base, socManufacturer: 'samsung', socModel: 'Exynos 2400' }),
    ).toEqual({
      kind: 'initials',
      initials: 'EX',
      name: 'Exynos',
    });
    expect(detectSocBrand({ ...base, socModel: 'Tensor G3' })).toEqual({
      kind: 'initials',
      initials: 'TE',
      name: 'Tensor',
    });
    expect(badgeInitials(detectSocBrand({ ...base, socModel: 'Kirin 9000' }))).toBe('KI');
  });

  it('never confuses Unisoc UMS codes with MediaTek', () => {
    const mark = detectSocBrand({ ...base, hardware: 'ums9620' });
    expect(mark).toEqual({ kind: 'initials', initials: 'UN', name: 'Unisoc' });
    expect(detectSocBrand({ ...base, socModel: 'Unisoc T760' })?.name).toBe('Unisoc');
  });

  it('uses the chipset label as a last resort', () => {
    expect(detectSocBrand({ ...base, chipset: 'MediaTek MT6886' })?.name).toBe('MediaTek');
    expect(detectSocBrand({ ...base, chipset: 'unknown chip' })).toBeNull();
  });
});

describe('detectGpuBrand', () => {
  it('uses the Arm mark for Mali and Immortalis', () => {
    expect(detectGpuBrand({ ...base, gpuRenderer: 'Mali-G610 MC6' })).toEqual({
      kind: 'logo',
      slug: 'arm',
      name: 'Mali',
    });
    expect(logoSlug(detectGpuBrand({ ...base, gpuRenderer: 'Immortalis-G715' }))).toBe('arm');
  });

  it('gives Adreno, PowerVR and Xclipse neutral badges', () => {
    expect(detectGpuBrand({ ...base, gpuRenderer: 'Adreno (TM) 740' })).toEqual({
      kind: 'initials',
      initials: 'AD',
      name: 'Adreno',
    });
    expect(detectGpuBrand({ ...base, gpuRenderer: 'PowerVR Rogue GE8320' })?.name).toBe('PowerVR');
    expect(detectGpuBrand({ ...base, gpuVendor: 'Samsung Xclipse' })?.name).toBe('Xclipse');
  });

  it('returns null for an unknown renderer instead of guessing', () => {
    expect(detectGpuBrand({ ...base, gpuRenderer: 'Software Rasterizer' })).toBeNull();
  });
});

describe('detectBrands', () => {
  it('returns every mark for a Galaxy S24', () => {
    const marks = detectBrands({
      ...base,
      manufacturer: 'samsung',
      brand: 'samsung',
      socManufacturer: 'Qualcomm',
      socModel: 'SM8650',
      hardware: 'qcom',
      gpuRenderer: 'Adreno (TM) 750',
      androidVersion: '14',
    });
    expect(marks.phone?.name).toBe('Samsung');
    expect(logoSlug(marks.platform)).toBe('android');
    expect(logoSlug(marks.soc)).toBe('qualcomm');
    expect(marks.gpu?.name).toBe('Adreno');
  });

  it('returns every mark for a Pixel', () => {
    const marks = detectBrands({
      ...base,
      manufacturer: 'Google',
      brand: 'google',
      socModel: 'Tensor G3',
      gpuRenderer: 'Mali-G715 MC7',
      androidVersion: '15',
    });
    expect(logoSlug(marks.phone)).toBe('google');
    expect(badgeInitials(marks.soc)).toBe('TE');
    expect(logoSlug(marks.gpu)).toBe('arm');
  });

  it('returns a MediaTek + Arm pair for a Nothing Phone', () => {
    const marks = detectBrands({
      ...base,
      manufacturer: 'nothing',
      brand: 'Nothing',
      hardware: 'mt6886',
      gpuRenderer: 'Mali-G610 MC4',
      androidVersion: '14',
    });
    expect(badgeInitials(marks.phone)).toBe('NO');
    expect(logoSlug(marks.soc)).toBe('mediatek');
    expect(logoSlug(marks.gpu)).toBe('arm');
  });
});
