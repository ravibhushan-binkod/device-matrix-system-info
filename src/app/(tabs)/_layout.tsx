import { Tabs } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { AppDrawer } from '@/design-system/components/app-drawer';
import { DashboardTabBar } from '@/design-system/components/dashboard-tab-bar';
import { TopAppBar } from '@/design-system/components/top-app-bar';
import { useTheme } from '@/design-system/theme';
import { DeveloperTools } from '@/features/dev-tools/components/developer-tools';

const tabs: { name: string; title: string }[] = [
  { name: 'index', title: 'Home' },
  { name: 'hardware', title: 'Hardware' },
  { name: 'network', title: 'Network' },
  { name: 'apps', title: 'Apps' },
  { name: 'tools', title: 'Tools' },
];

export default function TabsLayout() {
  const { colors } = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [developerToolsOpen, setDeveloperToolsOpen] = useState(false);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDeveloperTools = useCallback(() => setDeveloperToolsOpen(false), []);
  const openDeveloperTools = useCallback(() => setDeveloperToolsOpen(true), []);

  return (
    <View
      style={{ flex: 1, backgroundColor: colors.background }}
      importantForAccessibility={drawerOpen ? 'no-hide-descendants' : 'auto'}
    >
      <Tabs
        tabBar={(props) => <DashboardTabBar {...props} />}
        screenOptions={{
          header: () => <TopAppBar onOpenDrawer={openDrawer} />,
          sceneStyle: { backgroundColor: colors.background },
          animation: 'fade',
          tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.muted,
          tabBarLabelStyle: { fontFamily: 'Inter_400Regular', fontSize: 12 },
        }}
      >
        {tabs.map((tab) => (
          <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.title }} />
        ))}
      </Tabs>

      <AppDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        onOpenDeveloperTools={openDeveloperTools}
      />
      <DeveloperTools visible={developerToolsOpen} onClose={closeDeveloperTools} />
    </View>
  );
}
