import { useCallback, useEffect, useRef } from 'react';

import { useScreenFocused } from '@/design-system/hooks/use-screen-focused';

type Sample = {
  startedAt: number;
  lastAt: number;
  frames: number;
  dropped: number;
  worstGapMs: number;
};

function now(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

/**
 * Development-only scroll frame logger. Start it with `onScrollBeginDrag` and
 * stop it with `onScrollEndDrag`/`onMomentumScrollEnd`; it prints average fps,
 * dropped frames (>32 ms) and the worst gap to the Metro console.
 *
 * This measures the JS/JS-thread frame cadence, which is where list/price
 * layout work shows up first. Release builds compile the body away.
 */
export function useScrollFrameProbe(label: string) {
  const focused = useScreenFocused();
  const active = useRef(false);
  const sample = useRef<Sample | null>(null);
  const raf = useRef(0);

  const stop = useCallback(() => {
    if (!__DEV__ || !active.current) return;
    active.current = false;
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = 0;
    const current = sample.current;
    sample.current = null;
    if (current == null || current.frames < 2) return;
    const seconds = (current.lastAt - current.startedAt) / 1000;
    const fps = seconds > 0 ? current.frames / seconds : 0;
    const droppedPercent = (current.dropped / current.frames) * 100;
    console.info(
      `[perf] ${label}: ${fps.toFixed(1)} fps · ${current.dropped}/${current.frames} frames over 32 ms (${droppedPercent.toFixed(1)}%) · worst ${current.worstGapMs.toFixed(0)} ms`,
    );
  }, [label]);

  const start = useCallback(() => {
    if (!__DEV__ || !focused || active.current) return;
    active.current = true;
    const startedAt = now();
    sample.current = { startedAt, lastAt: startedAt, frames: 0, dropped: 0, worstGapMs: 0 };

    const tick = () => {
      const current = sample.current;
      if (!active.current || current == null) return;
      const at = now();
      const gap = at - current.lastAt;
      current.lastAt = at;
      current.frames += 1;
      if (current.frames > 1 && gap > 32) current.dropped += 1;
      if (current.frames > 1) current.worstGapMs = Math.max(current.worstGapMs, gap);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }, [focused]);

  useEffect(
    () => () => {
      active.current = false;
      if (raf.current) cancelAnimationFrame(raf.current);
    },
    [],
  );

  return {
    onScrollBeginDrag: start,
    onScrollEndDrag: stop,
    onMomentumScrollEnd: stop,
  };
}

/** Logs the time from Home mount to the first fully populated content frame. */
export function useFirstContentProbe(label: string, ready: boolean) {
  const mountedAt = useRef(now());
  const logged = useRef(false);

  useEffect(() => {
    if (!__DEV__ || !ready || logged.current) return;
    logged.current = true;
    console.info(
      `[perf] ${label}: first content ${(now() - mountedAt.current).toFixed(0)} ms after mount`,
    );
  }, [label, ready]);
}
