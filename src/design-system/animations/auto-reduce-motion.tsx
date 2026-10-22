import { useEffect } from 'react';
import DeviceInfo from 'react-native-device-info';

import { useSettingsStore } from '@/state/settings-store';

/** Below this average, the phone is visibly dropping frames. */
const SLOW_FPS = 45;
/** Let the first screen settle before deciding anything. */
const WARMUP_MS = 2_000;
/** A sustained window, not one unlucky frame. */
const SAMPLE_MS = 5_000;

function isLowEndDevice(): boolean {
  try {
    return DeviceInfo.isLowRamDevice();
  } catch {
    return false;
  }
}

/**
 * Session fallback for low-end phones: sample the frame rate after startup and
 * switch the app to Reduced when the average stays below 45 fps for five
 * seconds. Nothing is written to storage; the next launch starts at Full again
 * and the user can always choose a level in Settings.
 */
export function AutoReduceMotion() {
  const animationMode = useSettingsStore((state) => state.animationMode);
  const autoReduced = useSettingsStore((state) => state.autoReduced);
  const markAutoReduced = useSettingsStore((state) => state.markAutoReduced);

  useEffect(() => {
    if (__DEV__ || animationMode !== 'full' || autoReduced || !isLowEndDevice()) return;

    let raf = 0;
    let warmup: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const sample = () => {
      let frames = 0;
      let startedAt = 0;
      let last = 0;

      const tick = (now: number) => {
        if (cancelled) return;
        if (startedAt === 0) {
          startedAt = now;
          last = now;
        }
        frames += 1;
        last = now;
        if (now - startedAt >= SAMPLE_MS) {
          const seconds = (last - startedAt) / 1000;
          const fps = seconds > 0 ? frames / seconds : 0;
          if (fps > 0 && fps < SLOW_FPS) markAutoReduced();
          return;
        }
        raf = requestAnimationFrame(tick);
      };

      raf = requestAnimationFrame(tick);
    };

    warmup = setTimeout(sample, WARMUP_MS);

    return () => {
      cancelled = true;
      if (warmup) clearTimeout(warmup);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [animationMode, autoReduced, markAutoReduced]);

  return null;
}
