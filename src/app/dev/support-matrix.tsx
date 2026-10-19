import { Redirect } from 'expo-router';

import { SupportMatrixScreen } from '@/features/support-matrix/components/support-matrix-screen';

/** Dev-only route: every reading, ok / unavailable, one screen. */
export default function DevSupportMatrixRoute() {
  if (!__DEV__) {
    return <Redirect href="/" />;
  }
  return <SupportMatrixScreen />;
}
