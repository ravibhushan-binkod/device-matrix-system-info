import type { CameraDescriptor, CameraInfo } from '@/core/native';
import {
  buildCameraEntries,
  cameraFacingLabel,
  equivalent35mm,
  formatAperture,
  formatApertureList,
  formatEquivalent35mm,
  formatFocalLength,
  formatFocalList,
  formatIsoRange,
  formatMegapixels,
  formatMinFocus,
  formatSensorResolution,
  formatShutterNs,
  formatShutterRange,
  formatZoom,
  fpsRangesLabel,
  hardwareLevelLabel,
  physicalLensesLabel,
  sensorDiagonalMm,
  sensorSizeLabel,
  sensorTypeLabel,
  stabilizationLabel,
  videoSizeLabel,
} from '@/features/camera/services/camera-service';

jest.mock('@/core/native', () => ({
  getCameraInfo: jest.fn(),
}));

function descriptor(overrides: Partial<CameraDescriptor> = {}): CameraDescriptor {
  return {
    id: '0',
    facing: 'back',
    megapixels: null,
    sensorWidthPx: null,
    sensorHeightPx: null,
    sensorPhysicalWidthMm: null,
    sensorPhysicalHeightMm: null,
    aperture: null,
    apertures: null,
    focalLengthMm: null,
    focalLengthsMm: null,
    isoMin: null,
    isoMax: null,
    exposureMinNs: null,
    exposureMaxNs: null,
    minFocusDistance: null,
    maxDigitalZoom: null,
    rawSupport: null,
    videoSizes: null,
    fpsRanges: null,
    hardwareLevel: null,
    physicalCameraIds: null,
    flash: false,
    opticalStabilization: null,
    videoStabilization: null,
    ...overrides,
  };
}

const cameras: CameraInfo = {
  cameras: [
    descriptor({
      id: '0',
      facing: 'back',
      megapixels: 49.9,
      sensorWidthPx: 8160,
      sensorHeightPx: 6120,
      sensorPhysicalWidthMm: 8.2,
      sensorPhysicalHeightMm: 6.1,
      aperture: 1.88,
      apertures: [1.88],
      focalLengthMm: 6.9,
      focalLengthsMm: [6.9],
      isoMin: 100,
      isoMax: 6400,
      exposureMinNs: 125_000,
      exposureMaxNs: 333_333_333,
      minFocusDistance: 12.5,
      maxDigitalZoom: 8,
      rawSupport: true,
      videoSizes: [
        { widthPx: 3840, heightPx: 2160 },
        { widthPx: 1920, heightPx: 1080 },
      ],
      fpsRanges: [
        { minFps: 30, maxFps: 30 },
        { minFps: 30, maxFps: 60 },
      ],
      hardwareLevel: 'full',
      physicalCameraIds: ['2', '3'],
      flash: true,
      opticalStabilization: true,
      videoStabilization: true,
    }),
    descriptor({
      id: '2',
      facing: 'back',
      megapixels: 8,
      aperture: 2.2,
      focalLengthMm: 16,
      flash: false,
      opticalStabilization: false,
      videoStabilization: true,
    }),
    descriptor({
      id: '1',
      facing: 'front',
      megapixels: 32,
      flash: false,
      opticalStabilization: null,
      videoStabilization: null,
    }),
  ],
};

describe('basic formatters', () => {
  it('formats apertures', () => {
    expect(formatAperture(1.88)).toBe('f/1.88');
    expect(formatAperture(2.2)).toBe('f/2.2');
    expect(formatAperture(null)).toBeNull();
    expect(formatAperture(0)).toBeNull();
  });

  it('formats focal lengths', () => {
    expect(formatFocalLength(25)).toBe('25 mm');
    expect(formatFocalLength(4.25)).toBe('4.3 mm');
    expect(formatFocalLength(null)).toBeNull();
  });

  it('formats megapixels', () => {
    expect(formatMegapixels(49.9)).toBe('50 MP');
    expect(formatMegapixels(8)).toBe('8 MP');
    expect(formatMegapixels(1.2)).toBe('1.2 MP');
    expect(formatMegapixels(null)).toBeNull();
  });

  it('labels the facing', () => {
    expect(cameraFacingLabel('back')).toBe('Back');
    expect(cameraFacingLabel('front')).toBe('Front');
    expect(cameraFacingLabel('external')).toBe('External');
    expect(cameraFacingLabel('unknown')).toBeNull();
  });
});

describe('stabilizationLabel', () => {
  it('combines the reported capabilities', () => {
    expect(stabilizationLabel(true, true)).toBe('OIS + EIS');
    expect(stabilizationLabel(true, false)).toBe('OIS');
    expect(stabilizationLabel(false, true)).toBe('EIS');
  });

  it('reports none only when the camera did report the lists', () => {
    expect(stabilizationLabel(false, false)).toBe('None');
    expect(stabilizationLabel(null, null)).toBeNull();
    expect(stabilizationLabel(null, true)).toBe('EIS');
  });
});

describe('sensor math', () => {
  it('computes the diagonal from the physical size', () => {
    expect(sensorDiagonalMm(8.2, 6.1)).toBeCloseTo(10.22, 2);
  });

  it('returns null without both readable sides', () => {
    expect(sensorDiagonalMm(null, 6.1)).toBeNull();
    expect(sensorDiagonalMm(8.2, null)).toBeNull();
    expect(sensorDiagonalMm(0, 0)).toBeNull();
    expect(sensorDiagonalMm(-1, 5)).toBeNull();
  });

  it('derives the classic sensor type from the diagonal', () => {
    expect(sensorTypeLabel(10.22)).toBe('1/2.5"');
    expect(sensorTypeLabel(25.4)).toBe('1"');
    expect(sensorTypeLabel(43.27)).toBeNull();
    expect(sensorTypeLabel(null)).toBeNull();
  });

  it('labels the sensor size with the type when it fits the convention', () => {
    expect(sensorSizeLabel(8.2, 6.1)).toBe('8.2 × 6.1 mm · 1/2.5"');
    expect(sensorSizeLabel(36, 24)).toBe('36 × 24 mm');
    expect(sensorSizeLabel(null, 6.1)).toBeNull();
  });

  it('scales focal lengths to 35 mm equivalence', () => {
    expect(equivalent35mm(6.9, 10.22)).toBeCloseTo(29.2, 1);
    expect(formatEquivalent35mm(6.9, 10.22)).toBe('≈ 29 mm');
    expect(formatEquivalent35mm(null, 10.22)).toBeNull();
    expect(formatEquivalent35mm(6.9, null)).toBeNull();
  });
});

describe('exposure formatters', () => {
  it('formats ISO ranges', () => {
    expect(formatIsoRange(100, 6400)).toBe('ISO 100 – 6400');
    expect(formatIsoRange(100, 100)).toBe('ISO 100');
    expect(formatIsoRange(null, 6400)).toBe('up to ISO 6400');
    expect(formatIsoRange(100, null)).toBe('from ISO 100');
    expect(formatIsoRange(null, null)).toBeNull();
    expect(formatIsoRange(0, 0)).toBeNull();
  });

  it('formats shutter speeds', () => {
    expect(formatShutterNs(125_000)).toBe('1/8000 s');
    expect(formatShutterNs(333_333_333)).toBe('1/3 s');
    expect(formatShutterNs(2_000_000_000)).toBe('2 s');
    expect(formatShutterNs(null)).toBeNull();
    expect(formatShutterNs(0)).toBeNull();
  });

  it('formats shutter ranges with honest fallbacks', () => {
    expect(formatShutterRange(125_000, 333_333_333)).toBe('1/8000 s – 1/3 s');
    expect(formatShutterRange(125_000, null)).toBe('down to 1/8000 s');
    expect(formatShutterRange(null, 333_333_333)).toBe('up to 1/3 s');
    expect(formatShutterRange(null, null)).toBeNull();
  });

  it('turns focus dioptres into distances', () => {
    expect(formatMinFocus(12.5)).toBe('≈ 8 cm');
    expect(formatMinFocus(1.25)).toBe('≈ 80 cm');
    expect(formatMinFocus(0)).toBe('Fixed focus');
    expect(formatMinFocus(null)).toBeNull();
    expect(formatMinFocus(-1)).toBeNull();
  });

  it('formats the zoom ratio', () => {
    expect(formatZoom(8)).toBe('8×');
    expect(formatZoom(4.55)).toBe('4.6×');
    expect(formatZoom(0)).toBeNull();
    expect(formatZoom(null)).toBeNull();
  });
});

describe('video formatters', () => {
  it('sorts, de-duplicates and caps the video sizes', () => {
    expect(
      videoSizeLabel([
        { widthPx: 1920, heightPx: 1080 },
        { widthPx: 3840, heightPx: 2160 },
        { widthPx: 3840, heightPx: 2160 },
      ]),
    ).toBe('3840 × 2160 · 1920 × 1080');
    expect(videoSizeLabel(null)).toBeNull();
    expect(videoSizeLabel([])).toBeNull();
  });

  it('adds an honest "+N more" when the list is long', () => {
    const sizes = Array.from({ length: 6 }, (_, index) => ({
      widthPx: 800 + index * 16,
      heightPx: 600,
    }));
    expect(videoSizeLabel(sizes, 5)).toBe(
      '880 × 600 · 864 × 600 · 848 × 600 · 832 × 600 · 816 × 600 · +1 more',
    );
  });

  it('formats fps ranges', () => {
    expect(
      fpsRangesLabel([
        { minFps: 30, maxFps: 30 },
        { minFps: 30, maxFps: 60 },
        { minFps: 30, maxFps: 60 },
      ]),
    ).toBe('30 fps · 30–60 fps');
    expect(fpsRangesLabel(null)).toBeNull();
    expect(fpsRangesLabel([])).toBeNull();
  });
});

describe('list and level labels', () => {
  it('labels hardware levels', () => {
    expect(hardwareLevelLabel('legacy')).toBe('Legacy');
    expect(hardwareLevelLabel('limited')).toBe('Limited');
    expect(hardwareLevelLabel('full')).toBe('Full');
    expect(hardwareLevelLabel('level3')).toBe('Level 3');
    expect(hardwareLevelLabel('external')).toBe('External');
    expect(hardwareLevelLabel(null)).toBeNull();
  });

  it('lists apertures and focal lengths only when there is more than one', () => {
    expect(formatApertureList([1.8, 2.4])).toBe('f/1.8 · f/2.4');
    expect(formatApertureList([1.8])).toBeNull();
    expect(formatApertureList(null)).toBeNull();
    expect(formatFocalList([2.2, 6.9])).toBe('2.2 mm · 6.9 mm');
    expect(formatFocalList([2.2])).toBeNull();
  });

  it('formats the largest JPEG size', () => {
    expect(formatSensorResolution(8160, 6120)).toBe('8160 × 6120 px');
    expect(formatSensorResolution(null, 6120)).toBeNull();
    expect(formatSensorResolution(0, 0)).toBeNull();
  });

  it('labels the physical lenses behind a logical camera', () => {
    expect(physicalLensesLabel(['2', '3'])).toBe('2 lenses (IDs 2 · 3)');
    expect(physicalLensesLabel(['2'])).toBe('1 lens (IDs 2)');
    expect(physicalLensesLabel([])).toBeNull();
    expect(physicalLensesLabel(null)).toBeNull();
  });
});

describe('buildCameraEntries', () => {
  it('numbers cameras within a facing', () => {
    const entries = buildCameraEntries(cameras);
    expect(entries.map((entry) => entry.title)).toEqual([
      'Back camera 1',
      'Back camera 2',
      'Front camera',
    ]);
  });

  it('builds chips from the reported specs only', () => {
    const entries = buildCameraEntries(cameras);
    expect(entries[0]?.chips).toEqual(['50 MP', 'f/1.88', '6.9 mm']);
    expect(entries[2]?.chips).toEqual(['32 MP']);
  });

  it('fills every reading the main camera reports', () => {
    const entry = buildCameraEntries(cameras)[0]!;
    const specs = new Map(entry.specs.map((spec) => [spec.key, spec.value]));
    expect(specs.get('id')).toBe('0');
    expect(specs.get('level')).toBe('Full');
    expect(specs.get('sensor')).toBe('8.2 × 6.1 mm · 1/2.5"');
    expect(specs.get('resolution')).toBe('8160 × 6120 px');
    expect(specs.has('apertures')).toBe(false);
    expect(specs.has('focals')).toBe(false);
    expect(specs.get('equivalent')).toBe('≈ 29 mm');
    expect(specs.get('focus')).toBe('≈ 8 cm');
    expect(specs.get('zoom')).toBe('8×');
    expect(specs.get('iso')).toBe('ISO 100 – 6400');
    expect(specs.get('shutter')).toBe('1/8000 s – 1/3 s');
    expect(specs.get('video')).toBe('3840 × 2160 · 1920 × 1080');
    expect(specs.get('fps')).toBe('30 fps · 30–60 fps');
    expect(specs.get('physical')).toBe('2 lenses (IDs 2 · 3)');
    expect(specs.get('flash')).toBe('Yes');
    expect(specs.get('stabilization')).toBe('OIS + EIS');
    expect(specs.get('raw')).toBe('Yes');
  });

  it('keeps every spec row even when the value is missing', () => {
    const entries = buildCameraEntries(cameras);
    expect(entries[1]?.specs.find((spec) => spec.key === 'level')?.value).toBeNull();
    expect(entries[2]?.specs.find((spec) => spec.key === 'stabilization')?.value).toBeNull();
    expect(entries[2]?.specs.find((spec) => spec.key === 'raw')?.value).toBeNull();
  });

  it('adds the multi-lens rows when the camera reports several', () => {
    const multi = buildCameraEntries({
      cameras: [
        descriptor({
          id: '3',
          aperture: 1.8,
          apertures: [1.8, 2.4],
          focalLengthMm: 2.2,
          focalLengthsMm: [2.2, 6.9],
        }),
      ],
    });
    const specs = new Map(multi[0]!.specs.map((spec) => [spec.key, spec.value]));
    expect(specs.get('apertures')).toBe('f/1.8 · f/2.4');
    expect(specs.get('focals')).toBe('2.2 mm · 6.9 mm');
  });
});
