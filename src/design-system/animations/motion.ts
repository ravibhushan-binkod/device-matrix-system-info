/** Motion tokens — short, interruptible animations. Transform/opacity/paths only. */
export const durations = {
  fast: 140,
  normal: 240,
  slow: 420,
  sweep: 900,
  pulse: 1_400,
  breathe: 5_000,
} as const;

/** Delay step between staggered list items. */
export const staggerMs = 40;

/** The user-facing animation setting. */
export type MotionMode = 'full' | 'reduced' | 'off';

/** What components should actually do after system and performance fallbacks. */
export type MotionLevel = 'full' | 'reduced' | 'off';

/** Reanimated spring presets. */
export const springs = {
  press: { damping: 18, stiffness: 260, mass: 0.6 },
  bar: { damping: 16, stiffness: 130 },
  tab: { damping: 20, stiffness: 220, mass: 0.7 },
  layout: { damping: 22, stiffness: 190 },
} as const;

/** Longest stagger delay — keeps a long dashboard from feeling slow. */
export const maxStaggerIndex = 10;

export function staggerDelay(index: number): number {
  return Math.min(Math.max(0, index), maxStaggerIndex) * staggerMs;
}
