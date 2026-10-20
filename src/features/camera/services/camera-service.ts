import { getCameraInfo } from '@/core/native';
import type {
  CameraFacing,
  CameraFpsRange,
  CameraHardwareLevel,
  CameraInfo,
  CameraVideoSize,
} from '@/core/native';
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

/** Full-frame sensor diagonal, the reference for 35 mm equivalence. */
const FULL_FRAME_DIAGONAL_MM = 43.27;

/** Sensor diagonal in millimetres from the physical size; `null` without both sides. */
export function sensorDiagonalMm(widthMm: number | null, heightMm: number | null): number | null {
  if (widthMm == null || heightMm == null) return null;
  if (!(widthMm > 0) || !(heightMm > 0)) return null;
  const diagonal = Math.sqrt(widthMm * widthMm + heightMm * heightMm);
  return Number.isFinite(diagonal) ? diagonal : null;
}

/** The classic `1/x.y"` sensor type derived from the diagonal (16 mm ≈ 1"). */
export function sensorTypeLabel(diagonalMm: number | null): string | null {
  if (diagonalMm == null || !(diagonalMm > 0)) return null;
  const inverse = 25.4 / diagonalMm;
  if (Math.round(inverse * 10) / 10 === 1) return '1"';
  if (inverse < 1) return null;
  return `1/${trimNumber(inverse, 1)}"`;
}

/** e.g. `8.2 × 6.1 mm · 1/2.5"`; `null` without both physical dimensions. */
export function sensorSizeLabel(widthMm: number | null, heightMm: number | null): string | null {
  if (widthMm == null || heightMm == null || !(widthMm > 0) || !(heightMm > 0)) return null;
  const dimensions = `${trimNumber(widthMm, 2)} × ${trimNumber(heightMm, 2)} mm`;
  const type = sensorTypeLabel(sensorDiagonalMm(widthMm, heightMm));
  return type == null ? dimensions : `${dimensions} · ${type}`;
}

/** Focal length scaled to full frame by the sensor diagonals. */
export function equivalent35mm(focalMm: number | null, diagonalMm: number | null): number | null {
  if (focalMm == null || !(focalMm > 0)) return null;
  if (diagonalMm == null || !(diagonalMm > 0)) return null;
  const equivalent = focalMm * (FULL_FRAME_DIAGONAL_MM / diagonalMm);
  return Number.isFinite(equivalent) && equivalent > 0 ? equivalent : null;
}

/** e.g. "≈ 29 mm" — the 35 mm equivalent row. */
export function formatEquivalent35mm(
  focalMm: number | null,
  diagonalMm: number | null,
): string | null {
  const equivalent = equivalent35mm(focalMm, diagonalMm);
  return equivalent == null ? null : `≈ ${Math.round(equivalent)} mm`;
}

/** e.g. "ISO 100 – 6400"; falls back to the readable bound only. */
export function formatIsoRange(minIso: number | null, maxIso: number | null): string | null {
  const min = minIso != null && minIso > 0 ? Math.round(minIso) : null;
  const max = maxIso != null && maxIso > 0 ? Math.round(maxIso) : null;
  if (min == null && max == null) return null;
  if (min == null) return `up to ISO ${max}`;
  if (max == null) return `from ISO ${min}`;
  return min === max ? `ISO ${min}` : `ISO ${min} – ${max}`;
}

/** Exposure time: "1/8000 s", "1/3 s" or "2 s". */
export function formatShutterNs(nanoseconds: number | null): string | null {
  if (nanoseconds == null || !(nanoseconds > 0)) return null;
  const seconds = nanoseconds / 1e9;
  if (seconds >= 1) return `${trimNumber(seconds, 1)} s`;
  return `1/${Math.round(1 / seconds)} s`;
}

/** Shutter bounds: fastest – slowest, with honest single-bound fallbacks. */
export function formatShutterRange(minNs: number | null, maxNs: number | null): string | null {
  const fastest = formatShutterNs(minNs);
  const slowest = formatShutterNs(maxNs);
  if (fastest == null && slowest == null) return null;
  if (fastest == null) return `up to ${slowest}`;
  if (slowest == null) return `down to ${fastest}`;
  return `${fastest} – ${slowest}`;
}

/**
 * Focus distance from the lens dioptres (nearest focus = 1 / dioptres).
 * 0 dioptres means fixed focus, exactly as camera2 defines it.
 */
export function formatMinFocus(diopters: number | null): string | null {
  if (diopters == null || !Number.isFinite(diopters) || diopters < 0) return null;
  if (diopters === 0) return 'Fixed focus';
  const meters = 1 / diopters;
  if (meters < 1) return `≈ ${Math.round(meters * 100)} cm`;
  return `≈ ${trimNumber(meters, 1)} m`;
}

/** e.g. "8×" — Android's maximum zoom ratio (optical where available, then digital). */
export function formatZoom(maxZoom: number | null): string | null {
  if (maxZoom == null || !(maxZoom > 0)) return null;
  return `${trimNumber(maxZoom, 1)}×`;
}

/** Largest-first video output list, capped with an honest "+N more". */
export function videoSizeLabel(sizes: CameraVideoSize[] | null, maxRows = 5): string | null {
  if (sizes == null || sizes.length === 0) return null;
  const seen = new Set<string>();
  const unique: CameraVideoSize[] = [];
  for (const size of sizes) {
    if (!(size.widthPx > 0) || !(size.heightPx > 0)) continue;
    const key = `${size.widthPx}x${size.heightPx}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(size);
  }
  if (unique.length === 0) return null;
  unique.sort((a, b) => b.widthPx * b.heightPx - a.widthPx * a.heightPx);
  const shown = unique.slice(0, maxRows).map((size) => `${size.widthPx} × ${size.heightPx}`);
  const hidden = unique.length - shown.length;
  return hidden > 0 ? `${shown.join(' · ')} · +${hidden} more` : shown.join(' · ');
}

/** e.g. "30 fps · 30–60 fps" from the reported ranges. */
export function fpsRangesLabel(ranges: CameraFpsRange[] | null): string | null {
  if (ranges == null || ranges.length === 0) return null;
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const range of ranges) {
    const min = range.minFps > 0 ? Math.round(range.minFps) : null;
    const max = range.maxFps > 0 ? Math.round(range.maxFps) : null;
    if (min == null || max == null) continue;
    const label = min === max ? `${min} fps` : `${min}–${max} fps`;
    if (seen.has(label)) continue;
    seen.add(label);
    parts.push(label);
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

const HARDWARE_LEVEL_LABELS: Record<CameraHardwareLevel, string> = {
  legacy: 'Legacy',
  limited: 'Limited',
  full: 'Full',
  level3: 'Level 3',
  external: 'External',
};

export function hardwareLevelLabel(level: CameraHardwareLevel | null): string | null {
  return level == null ? null : HARDWARE_LEVEL_LABELS[level];
}

/** Every aperture when the camera reports more than one, e.g. "f/1.8 · f/2.4". */
export function formatApertureList(apertures: number[] | null): string | null {
  if (apertures == null) return null;
  const formatted = apertures
    .map((aperture) => formatAperture(aperture))
    .filter((value): value is string => value != null);
  return formatted.length > 1 ? formatted.join(' · ') : null;
}

/** Every focal length when the camera reports more than one. */
export function formatFocalList(focalLengthsMm: number[] | null): string | null {
  if (focalLengthsMm == null) return null;
  const formatted = focalLengthsMm
    .map((millimeters) => formatFocalLength(millimeters))
    .filter((value): value is string => value != null);
  return formatted.length > 1 ? formatted.join(' · ') : null;
}

/** Largest JPEG the camera reports. */
export function formatSensorResolution(widthPx: number | null, heightPx: number | null): string | null {
  if (widthPx == null || heightPx == null || widthPx <= 0 || heightPx <= 0) return null;
  return `${widthPx} × ${heightPx} px`;
}

/** Physical lenses behind a logical camera (Android 9+), e.g. "2 lenses (IDs 2 · 3)". */
export function physicalLensesLabel(ids: string[] | null): string | null {
  if (ids == null || ids.length === 0) return null;
  const noun = ids.length === 1 ? '1 lens' : `${ids.length} lenses`;
  return `${noun} (IDs ${ids.join(' · ')})`;
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

    const diagonal = sensorDiagonalMm(
      camera.sensorPhysicalWidthMm,
      camera.sensorPhysicalHeightMm,
    );

    // Multi-lens rows only appear when the camera reports more than one lens;
    // otherwise they would wrongly read as "not available".
    const apertureList = formatApertureList(camera.apertures);
    const focalList = formatFocalList(camera.focalLengthsMm);

    const specs: CameraSpec[] = [
      { key: 'id', label: 'Camera ID', value: camera.id },
      { key: 'level', label: 'Hardware level', value: hardwareLevelLabel(camera.hardwareLevel) },
      {
        key: 'sensor',
        label: 'Sensor',
        value: sensorSizeLabel(camera.sensorPhysicalWidthMm, camera.sensorPhysicalHeightMm),
      },
      {
        key: 'resolution',
        label: 'Max resolution',
        value: formatSensorResolution(camera.sensorWidthPx, camera.sensorHeightPx),
      },
      ...(apertureList != null
        ? [{ key: 'apertures', label: 'Apertures', value: apertureList, multiline: true }]
        : []),
      ...(focalList != null
        ? [{ key: 'focals', label: 'Focal lengths', value: focalList, multiline: true }]
        : []),
      {
        key: 'equivalent',
        label: '35 mm equivalent',
        value: formatEquivalent35mm(camera.focalLengthMm, diagonal),
      },
      { key: 'focus', label: 'Min focus', value: formatMinFocus(camera.minFocusDistance) },
      { key: 'zoom', label: 'Max zoom', value: formatZoom(camera.maxDigitalZoom) },
      { key: 'iso', label: 'ISO range', value: formatIsoRange(camera.isoMin, camera.isoMax) },
      {
        key: 'shutter',
        label: 'Shutter range',
        value: formatShutterRange(camera.exposureMinNs, camera.exposureMaxNs),
      },
      { key: 'video', label: 'Video sizes', value: videoSizeLabel(camera.videoSizes), multiline: true },
      { key: 'fps', label: 'Frame rates', value: fpsRangesLabel(camera.fpsRanges), multiline: true },
      {
        key: 'physical',
        label: 'Physical lenses',
        value: physicalLensesLabel(camera.physicalCameraIds),
      },
      { key: 'flash', label: 'Flash', value: camera.flash ? 'Yes' : 'No' },
      {
        key: 'stabilization',
        label: 'Stabilisation',
        value: stabilizationLabel(camera.opticalStabilization, camera.videoStabilization),
      },
      {
        key: 'raw',
        label: 'RAW capture',
        value: camera.rawSupport == null ? null : camera.rawSupport ? 'Yes' : 'No',
      },
    ];

    return { key: camera.id, title, chips, specs };
  });
}
