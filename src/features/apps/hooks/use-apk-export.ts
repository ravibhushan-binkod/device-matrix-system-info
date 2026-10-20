import { useCallback, useState } from 'react';

import { exportApk } from '@/features/apps/services/apps-service';

/**
 * Copies one app's base APK and opens the system share sheet. Only wired up
 * when the `apkExtraction` feature flag is on — the flag ships off.
 */
export function useApkExport(packageName: string, label: string) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const start = useCallback(() => {
    setBusy(true);
    setNotice(null);
    void exportApk(packageName, label).then((result) => {
      if (result.status !== 'ok') {
        setNotice(result.status === 'unavailable' ? result.reason : 'The APK could not be shared.');
      }
      setBusy(false);
    });
  }, [label, packageName]);

  return { busy, notice, start };
}
