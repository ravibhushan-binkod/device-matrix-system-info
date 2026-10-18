import { Tabs, useRouter } from 'expo-router';

import { HeaderIconButton } from '@/design-system/components';
import { Icon, type IconName } from '@/design-system/icon';
import { useTheme } from '@/design-system/theme';

const tabs: { name: string; title: string; icon: IconName }[] = [
  { name: 'index', title: 'Home', icon: 'home' },
  { name: 'hardware', title: 'Hardware', icon: 'cpu' },
  { name: 'network', title: 'Network', icon: 'wifi' },
  { name: 'apps', title: 'Apps', icon: 'apps' },
  { name: 'tools', title: 'Tools', icon: 'tools' },
];

export default function TabsLayout() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <Tabs
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
            tabBarIcon: ({ color }) => <Icon name={tab.icon} size={24} color={color as string} />,
          }}
        />
      ))}
    </Tabs>
  );
}
