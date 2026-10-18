import { Link } from 'expo-router';
import { StyleSheet } from 'react-native';

import { PlaceholderScreen } from '@/design-system/components';
import { SettingsIcon } from '@/design-system/icons';
import { useAppTheme } from '@/design-system/theme';

export default function SettingsScreen() {
  const { colors } = useAppTheme();

  return (
    <PlaceholderScreen
      icon={SettingsIcon}
      title="Settings"
      description="Theme, units and app preferences arrive with the settings phase."
    >
      {__DEV__ ? (
        <Link href="/gallery" style={[styles.devLink, { color: colors.accent }]}>
          Open design gallery
        </Link>
      ) : null}
    </PlaceholderScreen>
  );
}

const styles = StyleSheet.create({
  devLink: {
    marginTop: 8,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
