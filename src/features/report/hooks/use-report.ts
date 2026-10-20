import * as Clipboard from 'expo-clipboard';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useCallback, useMemo, useState } from 'react';
import { Share } from 'react-native';

import { features, isEnabled } from '@/core/features';
import {
  buildReport,
  buildReportHtml,
  REPORT_GROUPS,
} from '@/features/report/services/report-service';
import type { ReportGroupId } from '@/features/report/types';

/**
 * Report state: which sections are picked, the live preview and the three
 * exports (copy, share sheet, PDF when the flag is on).
 */
export function useReport() {
  const [selected, setSelected] = useState<ReadonlySet<ReportGroupId>>(
    () => new Set(REPORT_GROUPS.map((group) => group.id)),
  );
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const toggle = useCallback((id: ReportGroupId) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set(REPORT_GROUPS.map((group) => group.id)));
  }, []);

  const clearAll = useCallback(() => setSelected(new Set()), []);

  const text = useMemo(() => buildReport([...selected]), [selected]);

  const copy = useCallback(async () => {
    setBusy(true);
    setNotice(null);
    try {
      await Clipboard.setStringAsync(text);
      setNotice('Report copied to the clipboard.');
    } catch {
      setNotice('Copying the report failed.');
    } finally {
      setBusy(false);
    }
  }, [text]);

  const share = useCallback(async () => {
    setBusy(true);
    setNotice(null);
    try {
      await Share.share({ message: text });
    } catch {
      setNotice('Sharing the report failed.');
    } finally {
      setBusy(false);
    }
  }, [text]);

  const savePdf = useCallback(async () => {
    setBusy(true);
    setNotice(null);
    try {
      if (!(await Sharing.isAvailableAsync())) {
        setNotice('Sharing is not available on this device.');
        return;
      }
      const { uri } = await Print.printToFileAsync({ html: buildReportHtml(text) });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Save the report',
      });
    } catch {
      setNotice('Creating the PDF failed.');
    } finally {
      setBusy(false);
    }
  }, [text]);

  return {
    selected,
    toggle,
    selectAll,
    clearAll,
    copy,
    share,
    savePdf,
    pdfEnabled: isEnabled(features.pdfReport),
    notice,
    busy,
    text,
  };
}
