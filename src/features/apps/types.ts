/**
 * Types for the apps feature. Readings use the shared `Result<T>` model from
 * `@/core/result`; the app shapes themselves come from the native wrapper.
 */
export type AppFilter = 'all' | 'user' | 'system';

/** The installed-app list's sort keys. Size needs Usage Access. */
export type AppSort = 'name' | 'size' | 'installed' | 'updated' | 'targetSdk';

/** The two screen-time windows the analyzer offers. */
export type ScreenTimeRange = 'today' | 'week';

/** The two screen-time windows the Apps tab used in earlier phases. */
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

/** One bar in an analyzer chart: a count relative to the tallest bar. */
export type AppChartBar = {
  key: string;
  label: string;
  count: number;
  /** Count relative to the tallest bar (0..1). */
  share: number;
  /** Optional launcher icon (screen-time rankings join apps). */
  icon?: string | null;
  /** Optional caption under the label (screen time uses last-used time). */
  caption?: string | null;
};

/** The common permission groups the permission analyzer can pick. */
export type PermissionGroupKey =
  | 'camera'
  | 'microphone'
  | 'location'
  | 'contacts'
  | 'sms'
  | 'storage'
  | 'calendar'
  | 'phone'
  | 'nearby'
  | 'notifications'
  | 'activity';

export type PermissionGroup = {
  key: PermissionGroupKey;
  label: string;
  /** Android permission names that make an app match this group. */
  permissions: readonly string[];
};

/** One app in the permission analyzer, joined with its launcher metadata. */
export type PermissionAppRow = {
  packageName: string;
  label: string;
  icon: string | null;
  /** True when Android grants at least one requested permission in the group. */
  granted: boolean;
  requestedCount: number;
  grantedCount: number;
  /** Matching permissions declared in the manifest. */
  requested: string[];
};

/** One app in the screen-time ranking. */
export type ScreenTimeAppRow = {
  packageName: string;
  label: string;
  icon: string | null;
  totalTimeMs: number;
  lastUsedMs: number;
  /** Foreground time relative to the top row (0..1) for the share bar. */
  share: number;
};

export type ScreenTimeRanking = {
  rows: ScreenTimeAppRow[];
  moreApps: number;
  moreTimeMs: number;
};

/** One bar in the daily screen-time chart. */
export type ScreenTimeBar = {
  key: string;
  label: string;
  totalTimeMs: number;
  /** Time relative to the tallest bar (0..1). */
  share: number;
};
