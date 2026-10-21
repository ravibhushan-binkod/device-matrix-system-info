import { Linking, StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/design-system/animations/pressable-scale';
import { Card, Screen, SectionHeader } from '@/design-system/components';
import { useTheme } from '@/design-system/theme';
import { spacing, typography } from '@/design-system/tokens';

const GOOGLE_PRIVACY = 'https://policies.google.com/privacy';
const GOOGLE_PARTNERS = 'https://policies.google.com/technologies/partner-sites';

type PolicySection = {
  title: string;
  paragraphs: string[];
};

const POLICY: PolicySection[] = [
  {
    title: 'What the app reads',
    paragraphs: [
      'Device Matrix reads information about your phone — model and build, Android version, CPU and GPU, memory, storage, battery, thermal state, display, camera and sensor capabilities, network and Wi-Fi details, and the launcher apps Android reports.',
      'Everything is read through public Android APIs on this phone. When Android or the manufacturer does not expose a value, the app shows “Not available on this device” instead of guessing.',
    ],
  },
  {
    title: 'What stays on your phone',
    paragraphs: [
      'No account is required. The app has no backend, no cloud storage, no analytics and no crash-reporting service. Readings and app lists are not uploaded.',
      'Theme and dashboard choices, saved hardware-test results and your ads consent state are stored only in the app’s private storage. Clearing the app’s data or uninstalling the app removes them.',
      'A report you create is built on this phone. Text leaves only when you tap Copy or Share, and a PDF leaves only through Android’s share sheet.',
    ],
  },
  {
    title: 'Advertising',
    paragraphs: [
      'The app shows ads served by Google AdMob. To serve ads, Google’s Mobile Ads SDK may access your device’s advertising ID and basic device and app information, and may collect diagnostics and approximate location as described in Google’s own policies.',
      'Where required by law (for example in the EEA and the UK), the app asks for your consent through Google’s consent form before any ad is requested. You can change or withdraw that choice any time in Settings → Privacy → Ad privacy options.',
      'How Google uses data: policies.google.com/technologies/partner-sites and policies.google.com/privacy. You can reset or delete your Android advertising ID in Android Settings → Privacy → Ads.',
    ],
  },
  {
    title: 'Permissions',
    paragraphs: [
      'Internet and network state are used for ads. Vibration is used by haptic feedback. Set-alarm is used only when you create an alarm or timer. NFC is read-only and used only when you open that information. Modify-audio-settings is used only by the earpiece test.',
      'Location is requested only when you open Wi-Fi details or the Wi-Fi analyzer, because Android treats Wi-Fi network names and nearby-network scans as location data. Nearby Wi-Fi Devices is used only for the Android 13+ nearby-network list. Bluetooth Connect is requested only to read whether Bluetooth is on.',
      'Usage Access is optional and is opened from Android’s special-access settings. It is used only for the Apps tab’s sizes, screen time and permission analysis. The app never asks for contacts, SMS, camera, microphone or overlay permissions, and it never scans for or connects to Bluetooth devices.',
    ],
  },
  {
    title: 'Your choices',
    paragraphs: [
      'You can deny or revoke location, Nearby Wi-Fi Devices, Bluetooth Connect and Usage Access at any time in Android Settings. The app keeps working and shows “Not available on this device” for readings that need the permission.',
      'You can reset or withdraw your ads consent in Settings → Privacy → Ad privacy options where Google requires a consent choice. You can also reset your advertising ID in Android Settings.',
    ],
  },
  {
    title: 'Contact',
    paragraphs: [
      'Questions about this policy: use the developer contact shown on the Device Matrix: System Info Google Play listing.',
      'Last updated: 21 October 2026.',
    ],
  },
];

/** The hosted policy and this screen share the same text. */
export default function PrivacyScreen() {
  const { colors } = useTheme();

  return (
    <Screen scroll contentStyle={styles.content}>
      <View style={styles.lead}>
        <Text style={[styles.title, { color: colors.text }]}>Privacy policy</Text>
        <Text style={[styles.caption, { color: colors.muted }]}>
          Device Matrix: System Info · reads your phone, never uploads it.
        </Text>
      </View>

      {POLICY.map((section) => (
        <View key={section.title} style={styles.group}>
          <SectionHeader title={section.title} />
          <Card contentStyle={styles.cardBody}>
            {section.paragraphs.map((paragraph) => (
              <Text key={paragraph} style={[styles.paragraph, { color: colors.text }]}>
                {paragraph}
              </Text>
            ))}
            {section.title === 'Advertising' ? (
              <View style={styles.links}>
                <PressableScale
                  onPress={() => void Linking.openURL(GOOGLE_PARTNERS)}
                  accessibilityRole="link"
                  accessibilityLabel="Open Google partner sites policy"
                >
                  <Text style={[styles.link, { color: colors.accent }]}>
                    Google partner sites policy
                  </Text>
                </PressableScale>
                <PressableScale
                  onPress={() => void Linking.openURL(GOOGLE_PRIVACY)}
                  accessibilityRole="link"
                  accessibilityLabel="Open Google privacy policy"
                >
                  <Text style={[styles.link, { color: colors.accent }]}>Google privacy policy</Text>
                </PressableScale>
              </View>
            ) : null}
          </Card>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  lead: {
    gap: spacing.xs,
    paddingTop: spacing.sm,
  },
  title: {
    ...typography.display,
  },
  group: {
    gap: spacing.sm,
  },
  cardBody: {
    gap: spacing.md,
  },
  paragraph: {
    ...typography.body,
  },
  caption: {
    ...typography.caption,
  },
  links: {
    gap: spacing.sm,
  },
  link: {
    ...typography.body,
    textDecorationLine: 'underline',
  },
});
