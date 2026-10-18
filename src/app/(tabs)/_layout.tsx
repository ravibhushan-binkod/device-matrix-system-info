import { Tabs, useRouter } from 'expo-router';

import { HeaderIconButton } from '@/design-system/components';
import {
  AppsIcon,
  HardwareIcon,
  HomeIcon,
  NetworkIcon,
  SettingsIcon,
  ToolsIcon,
} from '@/design-system/icons';
import { useAppTheme } from '@/design-system/theme';

export default function TabsLayout() {
  const router = useRouter();
  const { colors } = useAppTheme();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: 'Inter_600SemiBold' },
        headerRight: () => (
          <HeaderIconButton
            icon={SettingsIcon}
            label="Settings"
            onPress={() => router.push('/settings')}
          />
        ),
        sceneStyle: { backgroundColor: colors.background },
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontFamily: 'Inter_400Regular', fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <HomeIcon color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="hardware"
        options={{
          title: 'Hardware',
          tabBarIcon: ({ color, size }) => <HardwareIcon color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="network"
        options={{
          title: 'Network',
          tabBarIcon: ({ color, size }) => <NetworkIcon color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="apps"
        options={{
          title: 'Apps',
          tabBarIcon: ({ color, size }) => <AppsIcon color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="tools"
        options={{
          title: 'Tools',
          tabBarIcon: ({ color, size }) => <ToolsIcon color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
