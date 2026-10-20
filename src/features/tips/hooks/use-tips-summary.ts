import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { runCheckUp } from '@/features/tips/services/tips-service';
import type { TipsReport } from '@/features/tips/types';

/**
 * The Home tip: a fresh check-up on every focus (the reads are a few
 * milliseconds), so the card always matches what the full screen would show.
 */
export function useTipsSummary(): TipsReport | null {
  const [report, setReport] = useState<TipsReport | null>(null);

  useFocusEffect(
    useCallback(() => {
      setReport(runCheckUp());
    }, []),
  );

  return report;
}
