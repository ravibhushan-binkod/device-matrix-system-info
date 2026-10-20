import { Tabs, useRouter } from 'expo-router';

import { DashboardTabBar } from '@/design-system/components/dashboard-tab-bar';
import { HeaderIconButton } from '@/design-system/components';
import { useTheme } from '@/design-system/theme';

const tabs: { name: string; title: string }[] = [
  { name: 'index', title: 'Home' },
  { name: 'hardware', title: 'Hardware' },
  { name: 'network', title: 'Network' },
  { name: 'apps', title: 'Apps' },
  { name: 'tools', title: 'Tools' },
];

export default function TabsLayout() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <Tabs
      tabBar={(props) => <DashboardTabBar {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: 'Inter_600SemiBold' },
        headerRight: () => (
          <HeaderIconButton
            name="settings"
            label="Settings"
            onPress={() => router.push('/settings')}
          />
        ),
        sceneStyle: { backgroundColor: colors.background },
        animation: 'fade',
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily: 'Inter_400Regular', fontSize: 12 },
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            headerShown: tab.name !== 'index',
          }}
        />
      ))}
    </Tabs>
  );
}
