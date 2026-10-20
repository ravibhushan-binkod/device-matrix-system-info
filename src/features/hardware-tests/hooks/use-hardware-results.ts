import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import {
  clearTestResult,
  readTestResults,
  recordTestResult,
} from '@/features/hardware-tests/services/results-service';
import type {
  HardwareTestId,
  HardwareTestOutcome,
  HardwareTestResults,
} from '@/features/hardware-tests/types';

/**
 * Results for the whole checkup. The overview and each test screen read from
 * this hook; the screen regains focus after an edit and re-reads the store.
 */
export function useHardwareResults() {
  const [results, setResults] = useState<HardwareTestResults>(() => readTestResults());

  const refresh = useCallback(() => {
    setResults(readTestResults());
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const record = useCallback((id: HardwareTestId, outcome: HardwareTestOutcome) => {
    const next = recordTestResult(id, outcome);
    setResults(next);
    return next;
  }, []);

  const clear = useCallback((id: HardwareTestId) => {
    const next = clearTestResult(id);
    setResults(next);
    return next;
  }, []);

  return { results, refresh, record, clear };
}
