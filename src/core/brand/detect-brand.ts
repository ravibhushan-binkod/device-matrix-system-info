import type { BrandLogoSlug } from '@/core/brand/brand-logos';

/**
 * A brand mark for a header or the Home hero. `logo` marks draw a licensed,
 * single-colour vector; `initials` marks are the neutral badge used whenever
 * no licensed logo exists. The name is the human-readable owner of the mark.
 */
export type BrandMark =
  | { kind: 'logo'; slug: BrandLogoSlug; name: string }
  | { kind: 'initials'; initials: string; name: string };

/**
 * Raw identifiers the app already reads. Detection never invents values: it
 * only normalises these strings and matches them against the tables below.
 */
export type BrandInput = {
  /** `Build.MANUFACTURER` / `Build.BRAND`, e.g. "samsung", "Google", "nothing". */
  manufacturer: string | null;
  brand: string | null;
  /** `Build.SOC_MANUFACTURER`, e.g. "Qualcomm", "MediaTek". */
  socManufacturer: string | null;
  /** `Build.SOC_MODEL`, e.g. "SM8650", "Tensor G3", "MT6886". */
  socModel: string | null;
  /** `Build.HARDWARE`, e.g. "qcom", "mt6886", "ums9620". */
  hardware: string | null;
  /** OpenGL renderer, e.g. "Mali-G610 MC6" or "Adreno (TM) 740". */
  gpuRenderer: string | null;
  gpuVendor: string | null;
  /** `Build.VERSION.RELEASE`; only used to spot a HarmonyOS build. */
  androidVersion: string | null;
};

/** Lowercase, strip trademark signs and bracketed noise, split on symbols. */
function normalize(value: string | null | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .replace(/[\u00ae\u2122\u2120]/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function tokens(normalized: string): string[] {
  return normalized.split(' ').filter((token) => token.length > 0);
}

/** Short needles must be whole tokens ("lg", "zte"); longer ones may be prefixes. */
function matchesAny(haystack: string, needles: readonly string[]): boolean {
  const parts = tokens(haystack);
  return needles.some((needle) => {
    if (needle.length <= 2) return parts.includes(needle);
    return parts.some((part) => part.includes(needle));
  });
}

/**
 * Up to two letters for the neutral badge: initials of the first two name
 * words ("Google Tensor" → "GT"), otherwise the first two letters of the one
 * word ("Exynos" → "EX"). Model numbers are ignored.
 */
export function initialsFor(name: string): string {
  const words = tokens(normalize(name)).filter((word) => !/\d/.test(word));
  if (words.length === 0) {
    const compact = normalize(name).replace(/[^a-z0-9]/g, '');
    return (compact.slice(0, 2) || '?').toUpperCase();
  }
  const first = words[0] as string;
  if (words.length === 1) {
    return (first.length > 1 ? first.slice(0, 2) : first).toUpperCase();
  }
  const second = words[1] as string;
  return `${first.charAt(0)}${second.charAt(0)}`.toUpperCase();
}

type BrandRule = {
  name: string;
  /** Present when a licensed, single-colour logo exists for this brand. */
  slug?: BrandLogoSlug;
  matches: readonly string[];
};

/**
 * Phone makers, longest/most specific first. Makers without a logo in
 * `brand-logos.ts` fall back to the neutral initials badge - no logo is ever
 * invented.
 */
const PHONE_BRANDS: readonly BrandRule[] = [
  { name: 'Samsung', slug: 'samsung', matches: ['samsung'] },
  { name: 'Google', slug: 'google', matches: ['google'] },
  { name: 'OnePlus', slug: 'oneplus', matches: ['oneplus'] },
  { name: 'Xiaomi', slug: 'xiaomi', matches: ['xiaomi', 'redmi', 'poco'] },
  { name: 'OPPO', slug: 'oppo', matches: ['oppo'] },
  { name: 'Vivo', slug: 'vivo', matches: ['vivo', 'iqoo'] },
  { name: 'HONOR', slug: 'honor', matches: ['honor'] },
  { name: 'Huawei', slug: 'huawei', matches: ['huawei'] },
  { name: 'Motorola', slug: 'motorola', matches: ['motorola', 'moto'] },
  { name: 'Nokia', slug: 'nokia', matches: ['nokia'] },
  { name: 'Sony', slug: 'sony', matches: ['sony'] },
  { name: 'ASUS', slug: 'asus', matches: ['asus'] },
  { name: 'LG', slug: 'lg', matches: ['lg', 'lge'] },
  { name: 'Lenovo', slug: 'lenovo', matches: ['lenovo'] },
  { name: 'Fairphone', slug: 'fairphone', matches: ['fairphone'] },
  { name: 'Sharp', slug: 'sharp', matches: ['sharp'] },
  { name: 'Meizu', slug: 'meizu', matches: ['meizu'] },
  { name: 'Nothing', matches: ['nothing'] },
  { name: 'realme', matches: ['realme'] },
  { name: 'TCL', matches: ['tcl'] },
  { name: 'Nubia', matches: ['nubia'] },
  { name: 'ZTE', matches: ['zte'] },
  { name: 'Black Shark', matches: ['blackshark', 'black shark'] },
  { name: 'Essential', matches: ['essential'] },
  { name: 'Tecno', matches: ['tecno'] },
  { name: 'Infinix', matches: ['infinix'] },
  { name: 'Itel', matches: ['itel'] },
  { name: 'Lava', matches: ['lava'] },
  { name: 'Micromax', matches: ['micromax'] },
];

function markFor(rule: BrandRule): BrandMark {
  return rule.slug != null
    ? { kind: 'logo', slug: rule.slug, name: rule.name }
    : { kind: 'initials', initials: initialsFor(rule.name), name: rule.name };
}

/**
 * The phone maker's mark: a licensed logo when one exists, otherwise the
 * brand's initials badge, otherwise `null` when Android reported nothing.
 */
export function detectPhoneBrand(input: BrandInput): BrandMark | null {
  const haystack = normalize(
    [input.manufacturer, input.brand].filter((value) => value != null).join(' '),
  );
  if (haystack.length === 0) return null;
  // Android reports literal "unknown" on some builds; that is not a brand.
  if (tokens(haystack).every((token) => token === 'unknown' || token === 'generic')) return null;

  for (const rule of PHONE_BRANDS) {
    if (matchesAny(haystack, rule.matches)) return markFor(rule);
  }

  // Unknown maker: use its first reported word for a neutral badge.
  const firstWord = tokens(haystack)[0] ?? 'device';
  const name = firstWord.charAt(0).toUpperCase() + firstWord.slice(1);
  return { kind: 'initials', initials: initialsFor(name), name };
}

/**
 * The OS mark: Android for a normal Android build, HarmonyOS when the build
 * reports it. Used by the Device/OS header; never used to guess hardware.
 */
export function detectPlatformBrand(input: BrandInput): BrandMark | null {
  const version = normalize(input.androidVersion);
  if (version.includes('harmony')) {
    return { kind: 'logo', slug: 'harmonyos', name: 'HarmonyOS' };
  }
  const raw = input.androidVersion?.trim();
  if (raw == null || raw.length === 0) return null;
  return { kind: 'logo', slug: 'android', name: `Android ${raw}` };
}

/**
 * SoC maker/family table. Order matters: Qualcomm before MediaTek (some
 * Qualcomm boards are named "mt" adjacent), and Unisoc last so `UMS`/`SC98`
 * codes never match MediaTek's `MT` patterns.
 */
const SOC_BRANDS: readonly BrandRule[] = [
  {
    name: 'Qualcomm',
    slug: 'qualcomm',
    matches: [
      'qualcomm',
      'snapdragon',
      'qcom',
      'sdm',
      'msm',
      'apq',
      'qsd',
      'qcm',
      'sm8',
      'sm7',
      'sm6',
      'sm4',
    ],
  },
  {
    name: 'MediaTek',
    slug: 'mediatek',
    matches: ['mediatek', 'dimensity', 'helio', 'mtk', 'mt6', 'mt8', 'mt9', 'mt2', 'mt5', 'mt7'],
  },
  { name: 'Exynos', matches: ['exynos', 's5e', 'universal'] },
  { name: 'Tensor', matches: ['tensor'] },
  { name: 'Kirin', matches: ['kirin', 'hisilicon', 'hi36'] },
  { name: 'Unisoc', matches: ['unisoc', 'spreadtrum', 'ums', 'sc98', 'sc77', 't6'] },
];

/**
 * The SoC mark from `Build.SOC_*`, `Build.HARDWARE` and the chipset label.
 * Returns `null` when nothing matches, so a header can fall back to the phone
 * maker instead of showing a wrong logo.
 */
export function detectSocBrand(input: BrandInput & { chipset?: string | null }): BrandMark | null {
  const haystack = normalize(
    [input.socManufacturer, input.socModel, input.hardware, input.chipset]
      .filter((value) => value != null && value.length > 0)
      .join(' '),
  );
  if (haystack.length === 0) return null;

  for (const rule of SOC_BRANDS) {
    if (matchesAny(haystack, rule.matches)) return markFor(rule);
  }
  return null;
}

/**
 * GPU family table. Mali and Immortalis are Arm designs, so the licensed Arm
 * mark is used; Adreno/PowerVR/Xclipse have no logo here and get the neutral
 * initials badge.
 */
const GPU_FAMILIES: readonly BrandRule[] = [
  { name: 'Mali', slug: 'arm', matches: ['mali', 'immortalis', 'bifrost', 'valhall'] },
  { name: 'Adreno', matches: ['adreno'] },
  { name: 'PowerVR', matches: ['powervr', 'rogue', 'imagination'] },
  { name: 'Xclipse', matches: ['xclipse'] },
];

/** The GPU mark from the OpenGL/Vulkan renderer and vendor strings. */
export function detectGpuBrand(input: BrandInput): BrandMark | null {
  const haystack = normalize(
    [input.gpuRenderer, input.gpuVendor].filter((value) => value != null).join(' '),
  );
  if (haystack.length === 0) return null;

  for (const rule of GPU_FAMILIES) {
    if (matchesAny(haystack, rule.matches)) return markFor(rule);
  }
  return null;
}

/** Both phone and SoC marks, in the order headers use them. */
export function detectBrands(input: BrandInput & { chipset?: string | null }): {
  phone: BrandMark | null;
  platform: BrandMark | null;
  soc: BrandMark | null;
  gpu: BrandMark | null;
} {
  return {
    phone: detectPhoneBrand(input),
    platform: detectPlatformBrand(input),
    soc: detectSocBrand(input),
    gpu: detectGpuBrand(input),
  };
}
