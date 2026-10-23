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
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AutoReduceMotion } from '@/design-system/animations/auto-reduce-motion';
import { CopyToast } from '@/design-system/components/copy-toast';
import { ThemeProvider, useTheme } from '@/design-system/theme';
import { useAdsBootstrap } from '@/core/ads/hooks/use-ads-bootstrap';
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
        <Stack.Screen name="units" options={{ title: 'Units and formats' }} />
        <Stack.Screen name="about" options={{ title: 'About' }} />
        <Stack.Screen name="privacy" options={{ title: 'Privacy policy' }} />
        <Stack.Screen name="widgets" options={{ title: 'Widgets' }} />
        <Stack.Screen name="licences" options={{ title: 'Open-source licences' }} />
        <Stack.Screen name="battery" options={{ title: 'Battery' }} />
        <Stack.Screen name="device" options={{ title: 'Device & OS' }} />
        <Stack.Screen name="cpu" options={{ title: 'CPU & GPU' }} />
        <Stack.Screen name="thermal" options={{ title: 'Thermal' }} />
        <Stack.Screen name="memory" options={{ title: 'Memory' }} />
        <Stack.Screen name="storage" options={{ title: 'Storage' }} />
        <Stack.Screen name="display" options={{ title: 'Display' }} />
        <Stack.Screen name="camera" options={{ title: 'Camera' }} />
        <Stack.Screen name="sensors" options={{ title: 'Sensors' }} />
        <Stack.Screen name="connectivity" options={{ title: 'Connectivity' }} />
        <Stack.Screen name="wifi-analyzer" options={{ title: 'Wi-Fi analyzer' }} />
        <Stack.Screen name="data-usage" options={{ title: 'Data usage' }} />
        <Stack.Screen name="sensors/[type]" options={{ title: 'Sensor' }} />
        <Stack.Screen name="apps/[package]" options={{ title: 'App details' }} />
        <Stack.Screen name="app-analyzer" options={{ title: 'App analyzer' }} />
        <Stack.Screen name="permission-analyzer" options={{ title: 'Permission analyzer' }} />
        <Stack.Screen name="screen-time" options={{ title: 'Screen time' }} />
        <Stack.Screen name="tips" options={{ title: 'Tips' }} />
        <Stack.Screen name="report" options={{ title: 'Export info' }} />
        <Stack.Screen name="alarm" options={{ title: 'Set alarm' }} />
        <Stack.Screen name="timer" options={{ title: 'Timer' }} />
        <Stack.Screen name="touch-test" options={{ title: 'Touch test', headerShown: false }} />
        <Stack.Screen name="screen-test" options={{ title: 'Screen test', headerShown: false }} />
        <Stack.Screen name="hardware-tests/index" options={{ title: 'Hardware tests' }} />
        <Stack.Screen name="hardware-tests/[test]" options={{ title: 'Hardware test' }} />
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

  // Consent first, then request configuration and SDK init (see src/core/ads).
  useAdsBootstrap();

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
        <AutoReduceMotion />
        <View style={{ flex: 1 }}>
          <Navigator />
          <CopyToast />
        </View>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
