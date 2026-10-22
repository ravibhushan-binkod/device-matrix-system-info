import { useEffect, useRef, useState } from 'react';

import { useMotionPreference } from '@/design-system/animations/use-motion-preference';

type Options = {
  /** Milliseconds for the number to reach its new value. */
  duration?: number;
  /** Round to this many decimals. */
  decimals?: number;
};

function easeOutCubic(value: number): number {
  return 1 - (1 - value) ** 3;
}

/**
 * Counts a number to its new value when movement is allowed. Under Reduced it
 * jumps immediately; under Off it also jumps, so the number is never stale.
 */
export function useCountUp(value: number, options: Options = {}): number {
  const { duration = 520, decimals = 0 } = options;
  const { animate } = useMotionPreference();
  const factor = 10 ** decimals;
  const [display, setDisplay] = useState(() => Math.round(value * factor) / factor);
  const from = useRef(value);

  useEffect(() => {
    if (!animate) {
      from.current = value;
      return;
    }

    const startValue = from.current;
    const delta = value - startValue;
    if (Math.abs(delta) < 10 ** -decimals / 2) {
      from.current = value;
      return;
    }

    let raf = 0;
    let startedAt: number | null = null;

    const tick = (now: number) => {
      if (startedAt == null) startedAt = now;
      const progress = Math.min(1, (now - startedAt) / duration);
      const next = startValue + delta * easeOutCubic(progress);
      setDisplay(Math.round(next * factor) / factor);
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        from.current = value;
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [animate, decimals, duration, factor, value]);

  return animate ? display : Math.round(value * factor) / factor;
}
