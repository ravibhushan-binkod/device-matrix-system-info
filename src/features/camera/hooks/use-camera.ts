import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import type { CameraInfo } from '@/core/native';
import type { Result } from '@/core/result';
import { readCameras } from '@/features/camera/services/camera-service';

/**
 * Camera descriptors never change while the app runs, so this reads once per
 * focus instead of polling. `cameras` is `null` until the first read lands.
 */
export function useCamera() {
  const [cameras, setCameras] = useState<Result<CameraInfo> | null>(null);

  useFocusEffect(
    useCallback(() => {
      setCameras(readCameras());
    }, []),
  );

  return { cameras };
}
