import { useCallback, useState } from 'react';

import type { AudioOutput } from '@/core/native';
import type { Result } from '@/core/result';
import { usePolling } from '@/core/hooks/use-polling';
import { readAudioOutput } from '@/features/hardware-tests/services/hardware-test-service';

/** Polls connected audio outputs while the screen is focused and awake. */
export function useHeadsetTest() {
  const [output, setOutput] = useState<Result<AudioOutput> | null>(null);

  const load = useCallback(() => {
    setOutput(readAudioOutput());
  }, []);

  const polling = usePolling(load, { intervalMs: 1_500 });

  return { output, ...polling };
}
