/**
 * Types for the apps feature. Readings use the shared `Result<T>` model from
 * `@/core/result`; the app shape itself comes from the native wrapper.
 */
export type AppFilter = 'all' | 'user' | 'system';

export type AppSort = 'name' | 'installed' | 'updated';

/** The two screen-time windows the Apps tab offers. */
export type UsageRange = 'today' | 'week';

/** One row of a screen-time or a largest-apps ranking, joined with its app. */
export type RankedApp = {
  packageName: string;
  label: string;
  icon: string | null;
  /** Foreground time in milliseconds (screen-time rankings; 0 otherwise). */
  totalTimeMs: number;
  /** App + data + cache bytes (size rankings; 0 otherwise). */
  totalBytes: number;
  cacheBytes: number;
  /** Value relative to the top row (0..1) for the small share bar. */
  share: number;
};
