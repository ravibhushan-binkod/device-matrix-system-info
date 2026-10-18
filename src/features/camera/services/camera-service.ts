import { getCameraInfo } from '@/core/native';
import type { CameraFacing, CameraInfo } from '@/core/native';
import type { Result } from '@/core/result';
import type { CameraEntry, CameraSpec } from '@/features/camera/types';

export function readCameras(): Result<CameraInfo> {
  return getCameraInfo();
}

export function cameraFacingLabel(facing: CameraFacing): string | null {
  switch (facing) {
    case 'back':
      return 'Back';
    case 'front':
      return 'Front';
    case 'external':
      return 'External';
    default:
      return null;
  }
}

function trimNumber(value: number, digits: number): string {
  return String(Math.round(value * 10 ** digits) / 10 ** digits);
}

/** e.g. `1.88` → "f/1.88", `2.2` → "f/2.2". */
export function formatAperture(aperture: number | null): string | null {
  if (aperture == null || !(aperture > 0)) return null;
  return `f/${trimNumber(aperture, 2)}`;
}

export function formatFocalLength(millimeters: number | null): string | null {
  if (millimeters == null || !(millimeters > 0)) return null;
  return `${trimNumber(millimeters, 1)} mm`;
}

/** e.g. `49.9` → "50 MP", `8` → "8 MP", `1.2` → "1.2 MP". */
export function formatMegapixels(megapixels: number | null): string | null {
  if (megapixels == null || !(megapixels > 0)) return null;
  if (megapixels >= 10) return `${Math.round(megapixels)} MP`;
  return `${trimNumber(megapixels, 1)} MP`;
}

/**
 * OIS / EIS from the reported capability lists. `null` when the camera
 * reported no stabilisation lists at all; "None" when it did report them and
 * none include an "on" mode.
 */
export function stabilizationLabel(optical: boolean | null, video: boolean | null): string | null {
  if (optical == null && video == null) return null;
  const parts: string[] = [];
  if (optical === true) parts.push('OIS');
  if (video === true) parts.push('EIS');
  return parts.length > 0 ? parts.join(' + ') : 'None';
}

/** One entry per camera, numbered within its facing when several share it. */
export function buildCameraEntries(info: CameraInfo): CameraEntry[] {
  const totals = new Map<CameraFacing, number>();
  for (const camera of info.cameras) {
    totals.set(camera.facing, (totals.get(camera.facing) ?? 0) + 1);
  }

  const seen = new Map<CameraFacing, number>();
  return info.cameras.map((camera) => {
    const index = (seen.get(camera.facing) ?? 0) + 1;
    seen.set(camera.facing, index);

    const facing = cameraFacingLabel(camera.facing);
    const multiple = (totals.get(camera.facing) ?? 0) > 1;
    const title =
      facing == null
        ? `Camera ${camera.id}`
        : multiple
          ? `${facing} camera ${index}`
          : `${facing} camera`;

    const chips = [
      formatMegapixels(camera.megapixels),
      formatAperture(camera.aperture),
      formatFocalLength(camera.focalLengthMm),
    ].filter((chip): chip is string => chip != null);

    const specs: CameraSpec[] = [
      { key: 'id', label: 'Camera ID', value: camera.id },
      { key: 'flash', label: 'Flash', value: camera.flash ? 'Yes' : 'No' },
      {
        key: 'stabilization',
        label: 'Stabilisation',
        value: stabilizationLabel(camera.opticalStabilization, camera.videoStabilization),
      },
    ];

    return { key: camera.id, title, chips, specs };
  });
}
