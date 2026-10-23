import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useCallback, useRef, useState } from 'react';
import { Share } from 'react-native';

import { features, isEnabled } from '@/core/features';
import { copyValue } from '@/design-system/copy/copy-value';
import {
  buildReport,
  REPORT_GROUPS,
  type ReportDocument,
} from '@/features/report/services/report-service';
import type { ReportGroupId } from '@/features/report/types';

export type ReportBusy = 'preview' | 'copy' | 'share' | 'pdf' | null;

/**
 * Report state: which sections are picked, the last preview and the three
 * exports. Selection changes invalidate the preview so a share can never
 * send something other than what the user just saw.
 */
export function useReport() {
  const [selected, setSelected] = useState<ReadonlySet<ReportGroupId>>(
    () => new Set(REPORT_GROUPS.map((group) => group.id)),
  );
  const [preview, setPreview] = useState<ReportDocument | null>(null);
  const [busy, setBusy] = useState<ReportBusy>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [includeIdentifying, setIncludeIdentifyingState] = useState(false);
  const requestId = useRef(0);

  const resetPreview = useCallback(() => {
    requestId.current += 1;
    setPreview(null);
    setBusy(null);
    setNotice(null);
  }, []);

  /** OFF by default; switching it invalidates the preview like any selection. */
  const setIncludeIdentifying = useCallback(
    (value: boolean) => {
      resetPreview();
      setIncludeIdentifyingState(value);
    },
    [resetPreview],
  );

  const toggle = useCallback(
    (id: ReportGroupId) => {
      resetPreview();
      setSelected((current) => {
        const next = new Set(current);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    },
    [resetPreview],
  );

  const selectAll = useCallback(() => {
    resetPreview();
    setSelected(new Set(REPORT_GROUPS.map((group) => group.id)));
  }, [resetPreview]);

  const clearAll = useCallback(() => {
    resetPreview();
    setSelected(new Set());
  }, [resetPreview]);

  const buildPreview = useCallback(async () => {
    if (selected.size === 0) {
      setNotice('Pick at least one section to build the report.');
      return;
    }
    const id = ++requestId.current;
    setBusy('preview');
    setNotice(null);
    try {
      const document = await buildReport([...selected], new Date(), { includeIdentifying });
      if (requestId.current !== id) return;
      setPreview(document);
    } catch {
      if (requestId.current === id) setNotice('Reading this device for the report failed.');
    } finally {
      if (requestId.current === id) setBusy(null);
    }
  }, [includeIdentifying, selected]);

  const copy = useCallback(async () => {
    if (!preview) return;
    setBusy('copy');
    setNotice(null);
    const copied = await copyValue(preview.text, 'Report');
    if (!copied) setNotice('Copying the report failed.');
    setBusy(null);
  }, [preview]);

  const share = useCallback(async () => {
    if (!preview) return;
    setBusy('share');
    setNotice(null);
    try {
      await Share.share({ message: preview.text, title: 'Device Matrix report' });
    } catch {
      setNotice('Sharing the report failed.');
    } finally {
      setBusy(null);
    }
  }, [preview]);

  const savePdf = useCallback(async () => {
    if (!preview) return;
    setBusy('pdf');
    setNotice(null);
    try {
      if (!(await Sharing.isAvailableAsync())) {
        setNotice('Sharing is not available on this device.');
        return;
      }
      const { uri } = await Print.printToFileAsync({ html: preview.html });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share the Device Matrix report',
      });
      setNotice('PDF opened in the share sheet.');
    } catch {
      setNotice('Creating the PDF failed.');
    } finally {
      setBusy(null);
    }
  }, [preview]);

  return {
    selected,
    toggle,
    selectAll,
    clearAll,
    includeIdentifying,
    setIncludeIdentifying,
    preview,
    buildPreview,
    copy,
    share,
    savePdf,
    pdfEnabled: isEnabled(features.pdfReport),
    notice,
    busy,
  };
}
