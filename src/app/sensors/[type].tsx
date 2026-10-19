import { useLocalSearchParams } from 'expo-router';

import { SensorDetailScreen } from '@/features/sensors/components/sensor-detail-screen';

export default function SensorDetailRoute() {
  const params = useLocalSearchParams<{ type?: string }>();
  const parsed = params.type == null ? Number.NaN : Number(params.type);
  const type = Number.isFinite(parsed) ? Math.trunc(parsed) : null;

  return <SensorDetailScreen type={type} />;
}
