import { useState } from 'react';

import { usePolling } from '@/core/hooks/use-polling';
import { readDashboardSummary } from '@/features/dashboard/services/dashboard-service';
import type { DashboardSummary } from '@/features/dashboard/types';

/**
 * Live values for the widget previews. It uses the same five-second dashboard
 * read as Home and pauses with the shared polling hook when the screen loses
 * focus or the app backgrounds.
 */
export function useWidgetPreview(): DashboardSummary | null {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  usePolling(() => setSummary(readDashboardSummary()), { intervalMs: 5_000 });

  return summary;
}
