import type { CameraInfo } from '@/core/native';
import {
  buildCameraEntries,
  cameraFacingLabel,
  formatAperture,
  formatFocalLength,
  formatMegapixels,
  stabilizationLabel,
} from '@/features/camera/services/camera-service';

jest.mock('@/core/native', () => ({
  getCameraInfo: jest.fn(),
}));

const cameras: CameraInfo = {
  cameras: [
    {
      id: '0',
      facing: 'back',
      megapixels: 49.9,
      aperture: 1.88,
      focalLengthMm: 25,
      flash: true,
      opticalStabilization: true,
      videoStabilization: true,
    },
    {
      id: '2',
      facing: 'back',
      megapixels: 8,
      aperture: 2.2,
      focalLengthMm: 16,
      flash: false,
      opticalStabilization: false,
      videoStabilization: true,
    },
    {
      id: '1',
      facing: 'front',
      megapixels: 32,
      aperture: null,
      focalLengthMm: null,
      flash: false,
      opticalStabilization: null,
      videoStabilization: null,
    },
  ],
};

describe('formatters', () => {
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
    expect(entries[0]?.chips).toEqual(['50 MP', 'f/1.88', '25 mm']);
    expect(entries[2]?.chips).toEqual(['32 MP']);
  });

  it('keeps every spec row even when the value is missing', () => {
    const entries = buildCameraEntries(cameras);
    expect(entries[0]?.specs).toEqual([
      { key: 'id', label: 'Camera ID', value: '0' },
      { key: 'flash', label: 'Flash', value: 'Yes' },
      { key: 'stabilization', label: 'Stabilisation', value: 'OIS + EIS' },
    ]);
    expect(entries[2]?.specs.find((spec) => spec.key === 'stabilization')?.value).toBeNull();
  });
});
