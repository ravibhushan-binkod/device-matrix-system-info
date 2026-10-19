// Import only the weights the app uses. The package root re-exports every
// weight and italic style (18 files for Inter alone), and Metro bundles each
// one it can see — importing the root would ship ~7.5 MB of unused fonts.
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono/400Regular';
import { useFonts } from 'expo-font';
import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider as NavigationThemeProvider,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ThemeProvider, useTheme } from '@/design-system/theme';
import { useSettingsStore } from '@/state/settings-store';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Navigator() {
  const { scheme, colors } = useTheme();

  const baseTheme = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
    },
  };

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { fontFamily: 'Inter_600SemiBold' },
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        <Stack.Screen name="battery" options={{ title: 'Battery' }} />
        <Stack.Screen name="device" options={{ title: 'Device & OS' }} />
        <Stack.Screen name="cpu" options={{ title: 'CPU & GPU' }} />
        <Stack.Screen name="thermal" options={{ title: 'Thermal' }} />
        <Stack.Screen name="memory" options={{ title: 'Memory' }} />
        <Stack.Screen name="storage" options={{ title: 'Storage' }} />
        <Stack.Screen name="display" options={{ title: 'Display' }} />
        <Stack.Screen name="camera" options={{ title: 'Camera' }} />
        <Stack.Screen name="sensors" options={{ title: 'Sensors' }} />
        <Stack.Screen name="sensors/[type]" options={{ title: 'Sensor' }} />
        <Stack.Screen name="apps/[package]" options={{ title: 'App details' }} />
        <Stack.Screen name="tips" options={{ title: 'Tips' }} />
        <Stack.Screen name="report" options={{ title: 'Report' }} />
        <Stack.Screen name="alarm" options={{ title: 'Set alarm' }} />
        <Stack.Screen name="timer" options={{ title: 'Timer' }} />
        <Stack.Screen name="touch-test" options={{ title: 'Touch test', headerShown: false }} />
        <Stack.Screen name="screen-test" options={{ title: 'Screen test', headerShown: false }} />
        <Stack.Screen name="dev/gallery" options={{ title: 'Dev Gallery' }} />
      </Stack>
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  const themeMode = useSettingsStore((state) => state.themeMode);
  const accent = useSettingsStore((state) => state.accent);

  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
    JetBrainsMono_400Regular,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider mode={themeMode} accent={accent}>
        <Navigator />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
