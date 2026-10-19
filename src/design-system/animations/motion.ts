/** Motion tokens — short, interruptible animations. Transform/opacity/paths only. */
export const durations = {
  fast: 140,
  normal: 240,
  slow: 420,
  sweep: 900,
} as const;

/** Delay step between staggered list items. */
export const staggerMs = 40;

/** Reanimated spring presets. */
export const springs = {
  press: { damping: 18, stiffness: 260, mass: 0.6 },
  bar: { damping: 16, stiffness: 130 },
} as const;
