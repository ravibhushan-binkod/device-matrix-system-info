import { useLocalSearchParams } from 'expo-router';

import { EmptyState, Screen } from '@/design-system/components';
import { AppDetailScreen } from '@/features/apps/components/app-detail-screen';

export default function AppDetailRoute() {
  const params = useLocalSearchParams<{ package?: string }>();
  const packageName =
    typeof params.package === 'string' && params.package !== '' ? params.package : null;

  if (packageName == null) {
    return (
      <Screen scroll>
        <EmptyState
          icon="apps"
          title="App not found"
          message="This link does not name an app package."
        />
      </Screen>
    );
  }

  return <AppDetailScreen packageName={packageName} />;
}
