import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, PermissionsAndroid, type Permission } from 'react-native';
import { useFocusEffect } from 'expo-router';

/**
 * How the UI has to treat a runtime permission:
 * - `checking` the first check has not returned yet
 * - `granted`  the permission is held
 * - `denied`   not granted, but Android will still show the dialog
 * - `blocked`  Android will not ask again ("don't ask again", or denied twice) —
 *              the only path left is this app's page in the system settings
 */
export type PermissionState = 'checking' | 'granted' | 'denied' | 'blocked';

export type UsePermission = {
  state: PermissionState;
  granted: boolean;
  /** Android still shows the system dialog when asked. */
  canAskAgain: boolean;
  /** Shows the system dialog and resolves with the resulting state. */
  request: () => Promise<PermissionState>;
  /** Re-reads the current state (e.g. after a settings trip). */
  refresh: () => Promise<void>;
};

/**
 * Checks and requests one Android runtime permission. The state re-checks
 * whenever the app returns to the foreground, so a permission granted in the
 * system settings is picked up automatically.
 */
export function usePermission(permission: Permission): UsePermission {
  const [state, setState] = useState<PermissionState>('checking');

  const refresh = useCallback(async () => {
    try {
      const granted = await PermissionsAndroid.check(permission);
      setState((previous) => (granted ? 'granted' : previous === 'blocked' ? 'blocked' : 'denied'));
    } catch {
      // A failed check means "not granted" as far as the UI is concerned.
      setState((previous) => (previous === 'checking' ? 'denied' : previous));
    }
  }, [permission]);

  // Initial check plus a fresh check whenever the screen regains focus.
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') void refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  const request = useCallback(async (): Promise<PermissionState> => {
    try {
      const result = await PermissionsAndroid.request(permission);
      const next: PermissionState =
        result === PermissionsAndroid.RESULTS.GRANTED
          ? 'granted'
          : result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN
            ? 'blocked'
            : 'denied';
      setState(next);
      return next;
    } catch {
      setState('denied');
      return 'denied';
    }
  }, [permission]);

  return {
    state,
    granted: state === 'granted',
    canAskAgain: state !== 'blocked',
    request,
    refresh,
  };
}

/** Opens this app's page in the Android settings (the path after "don't ask again"). */
export function openAppSettings(): void {
  Linking.openSettings().catch(() => {});
}
