/**
 * Every threshold the tips engine uses, in one place.
 *
 * The values are plain Android defaults — change them here only; the rules in
 * `services/tips-rules.ts` read nothing else. `null` readings never produce a
 * tip, whatever the threshold.
 */
export const tipsConfig = {
  storage: {
    /** Free space below this percentage is a warning… */
    warnFreePercent: 15,
    /** …and below this one it is critical. */
    criticalFreePercent: 8,
  },
  memory: {
    /** Used RAM above this percentage is flagged. */
    usedPercent: 85,
  },
  uptime: {
    /** Days since the last restart before the phone gets a "restart" tip. */
    days: 7,
  },
  battery: {
    /** Battery temperature above this many °C is flagged. */
    temperatureC: 40,
    /** Level below this percentage is flagged when Battery Saver is off. */
    lowPercent: 20,
  },
  display: {
    /** Refresh rates at or above this many Hz are flagged as a battery cost. */
    refreshRateHz: 90,
    /** Screen timeouts longer than this many milliseconds are flagged. */
    screenTimeoutMs: 60_000,
    /** Manual brightness at or above this percentage is flagged as high. */
    brightnessPercent: 70,
  },
  developer: {
    /** Animation scale above 1× is flagged (1× is the Android default). */
    animationScale: 1,
  },
  wifi: {
    /** Signal below this many dBm is flagged as weak. */
    weakRssiDbm: -75,
  },
  security: {
    /** Security patches older than this many months are flagged. */
    patchMonths: 12,
  },
} as const;
