import { Directory, Paths } from 'expo-file-system';

import { ok, unavailable, type Result } from '@/core/result';

export type AppCacheClear = {
  freedBytes: number;
  /** Entries that could not be removed (locked while in use, for example). */
  failedEntries: number;
};

/** The app's own cache directory — clearing it can never touch user files. */
function cacheDirectory(): Directory {
  return new Directory(Paths.cache);
}

export function getAppCacheSize(): Result<number> {
  try {
    const size = cacheDirectory().size;
    if (size == null) return unavailable('Android did not report the app cache size.');
    return ok(size);
  } catch {
    return unavailable('Reading the app cache size failed.');
  }
}

/**
 * Deletes every entry inside the app's cache directory and reports how many
 * bytes were freed. Only this app's cache is touched.
 */
export function clearAppCache(): Result<AppCacheClear> {
  try {
    const directory = cacheDirectory();
    const before = directory.size ?? 0;
    let failedEntries = 0;

    for (const entry of directory.list()) {
      try {
        entry.delete();
      } catch {
        failedEntries += 1;
      }
    }

    const after = directory.size ?? 0;
    const freedBytes = Math.max(0, before - after);
    if (failedEntries > 0 && freedBytes === 0) {
      return unavailable('The app cache could not be cleared.');
    }
    return ok({ freedBytes, failedEntries });
  } catch {
    return unavailable('Clearing the app cache failed.');
  }
}
