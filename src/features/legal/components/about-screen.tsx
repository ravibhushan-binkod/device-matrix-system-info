import * as Application from 'expo-application';
import { StyleSheet, Text, View } from 'react-native';

import { AppLogo, Card, Screen, SectionHeader } from '@/design-system/components';
import { useTheme } from '@/design-system/theme';
import { spacing, typography } from '@/design-system/tokens';
import { ABOUT_CAPTION, TRADEMARK_NOTICE } from '@/features/legal/content';

/**
 * About: the product identity, installed version, one short description and
 * the free-app/trademark notes. No Rate button and no duplicated legal text —
 * the drawer owns Privacy and Rate.
 */
export function AboutScreen() {
  const { colors } = useTheme();
  const version = Application.nativeApplicationVersion?.trim() || '1.0.0';
  const build = Application.nativeBuildVersion?.trim();
  const versionLine = build ? `Version ${version} (build ${build})` : `Version ${version}`;

  return (
    <Screen scroll contentStyle={styles.content}>
      <View style={styles.lead}>
        <View style={styles.logoShell}>
          <AppLogo size={72} decorative />
        </View>
        <View style={styles.leadCopy}>
          <Text style={[styles.title, { color: colors.text }]}>Device Matrix: System Info</Text>
          <Text style={[styles.caption, { color: colors.muted }]}>{versionLine}</Text>
        </View>
      </View>

      <Card contentStyle={styles.cardBody}>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          A clear, on-device view of your phone&apos;s hardware and software: device and Android
          build, processor and graphics, memory, storage, battery, heat, display, camera, sensors
          and networks.
        </Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          {ABOUT_CAPTION} When Android does not expose a reading, the app says “Not available on
          this device” instead of guessing.
        </Text>
        <Text style={[styles.developer, { color: colors.muted }]}>Developed by Binkod Tech</Text>
      </Card>

      <SectionHeader title="Free app, supported by ads" />
      <Card contentStyle={styles.cardBody}>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          Device Matrix is free to use. Ads served by Google AdMob support development. They never
          appear on Settings, permission explanations, hardware tests or live graphs. Where the law
          requires it, Google&apos;s consent form asks for your choice before an ad is requested.
        </Text>
      </Card>

      <SectionHeader title="Trademarks" />
      <Card contentStyle={styles.cardBody}>
        <Text style={[styles.paragraph, { color: colors.text }]}>{TRADEMARK_NOTICE}</Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  lead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  logoShell: {
    width: 88,
    height: 88,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  leadCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    ...typography.title,
  },
  caption: {
    ...typography.caption,
  },
  cardBody: {
    gap: spacing.md,
  },
  paragraph: {
    ...typography.body,
  },
  developer: {
    ...typography.caption,
    fontFamily: 'Inter_600SemiBold',
  },
});
