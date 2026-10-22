import * as Application from 'expo-application';
import { type Href, Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Card, Screen, SectionHeader } from '@/design-system/components';
import { useTheme } from '@/design-system/theme';
import { spacing, typography } from '@/design-system/tokens';
import { LEGAL_REVIEW_NOTICE, TRADEMARK_NOTICE } from '@/features/legal/content';

type AboutLink = {
  label: string;
  description: string;
  href: Href;
};

const LINKS: readonly AboutLink[] = [
  {
    label: 'Units and formats',
    description: 'Temperature, storage, frequency and the other readings',
    href: '/units',
  },
  {
    label: 'Privacy policy',
    description: 'What is read, what stays on the phone, how ads work',
    href: '/privacy',
  },
  {
    label: 'Terms of use',
    description: 'The conditions for using the app',
    href: '/terms',
  },
  {
    label: 'Disclaimer',
    description: 'Estimates, Android differences and safety limits',
    href: '/disclaimer',
  },
  {
    label: 'Open-source licences',
    description: 'The libraries and assets the app is built with',
    href: '/licences',
  },
];

/** About: who the app is, which version is installed and every legal page. */
export function AboutScreen() {
  const { colors } = useTheme();
  const version = Application.nativeApplicationVersion?.trim();

  return (
    <Screen scroll contentStyle={styles.content}>
      <View style={styles.lead}>
        <Text style={[styles.title, { color: colors.text }]}>Device Matrix</Text>
        <Text style={[styles.caption, { color: colors.muted }]}>
          System Info{version ? ` · version ${version}` : ''}
        </Text>
      </View>

      <Card contentStyle={styles.cardBody}>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          Device Matrix shows what your phone reports about itself: the device and Android build,
          processor and graphics, memory, storage, battery, heat, display, camera, sensors and
          networks.
        </Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          Every reading is made on this phone with the interfaces normal Android apps may use. When
          Android or the manufacturer does not expose a value, the app says “Not available on this
          device” instead of guessing.
        </Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          There is no account, no cloud storage and no analytics. The only network traffic is ads
          served by Google AdMob; where the law requires it, the app asks for consent before any ad
          is requested, and you can change that choice any time under Settings → Privacy → Ad
          privacy options.
        </Text>
      </Card>

      <SectionHeader title="More information" />
      <Card contentStyle={styles.links}>
        {LINKS.map((link) => (
          <Link key={String(link.href)} href={link.href} asChild>
            <Text
              accessibilityRole="link"
              accessibilityLabel={link.label}
              style={styles.linkRow}
              suppressHighlighting
            >
              <Text style={[styles.linkTitle, { color: colors.accent }]}>{link.label}</Text>
              {'\n'}
              <Text style={[styles.linkDescription, { color: colors.muted }]}>
                {link.description}
              </Text>
            </Text>
          </Link>
        ))}
      </Card>

      <SectionHeader title="Trademarks" />
      <Card contentStyle={styles.cardBody}>
        <Text style={[styles.paragraph, { color: colors.text }]}>{TRADEMARK_NOTICE}</Text>
      </Card>

      <Text style={[styles.caption, styles.notice, { color: colors.muted }]}>
        {LEGAL_REVIEW_NOTICE}
      </Text>
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
  caption: {
    ...typography.caption,
  },
  cardBody: {
    gap: spacing.md,
  },
  paragraph: {
    ...typography.body,
  },
  links: {
    gap: spacing.md,
  },
  linkRow: {
    gap: 2,
  },
  linkTitle: {
    ...typography.body,
    fontFamily: 'Inter_600SemiBold',
  },
  linkDescription: {
    ...typography.caption,
  },
  notice: {
    paddingHorizontal: spacing.xs,
  },
});
