import { useMemo } from 'react';
import { useReducedMotion as useSystemReducedMotion } from 'react-native-reanimated';

import type { MotionLevel, MotionMode } from '@/design-system/animations/motion';
import { useSettingsStore } from '@/state/settings-store';

export type MotionPreference = {
  /** The setting the user chose (before system/performance fallbacks). */
  requested: MotionMode;
  /** What components should do now. */
  level: MotionLevel;
  /** Full movement (transforms, loops, parallax, chart sweeps). */
  animate: boolean;
  /** Opacity-only transitions are still allowed. */
  allowFade: boolean;
  /** Continuous loops (breathing, particles, shader drift) may run. */
  loops: boolean;
  /** A short reason for the effective level, shown only in Settings. */
  source: 'setting' | 'system' | 'performance';
};

/**
 * One motion preference for the whole app.
 *
 * - `full` animates movement and loops.
 * - `reduced` keeps short opacity fades but drops transforms, parallax and loops.
 * - `off` renders changes immediately.
 *
 * The system reduce-motion switch always wins over "Full", and the low-end
 * fallback marks the session as reduced when the frame probe sees drops.
 */
export function useMotionPreference(): MotionPreference {
  const requested = useSettingsStore((state) => state.animationMode);
  const autoReduced = useSettingsStore((state) => state.autoReduced);
  const systemReduced = useSystemReducedMotion();

  return useMemo(() => {
    let level: MotionLevel = requested;
    let source: MotionPreference['source'] = 'setting';
    if (requested === 'full' && systemReduced) {
      level = 'reduced';
      source = 'system';
    } else if (requested === 'full' && autoReduced) {
      level = 'reduced';
      source = 'performance';
    }

    return {
      requested,
      level,
      animate: level === 'full',
      allowFade: level !== 'off',
      loops: level === 'full',
      source,
    };
  }, [autoReduced, requested, systemReduced]);
}
