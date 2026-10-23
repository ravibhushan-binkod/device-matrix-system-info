import type { ReactNode } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/design-system/animations/pressable-scale';
import { Card, Screen, SectionHeader } from '@/design-system/components';
import { useTheme } from '@/design-system/theme';
import { spacing, typography } from '@/design-system/tokens';
import { type LegalDocument } from '@/features/legal/content';

/**
 * Renders one legal document from the shared content file. The same Privacy
 * Policy words are published in `docs/legal/privacy-policy.html`.
 */
export function LegalDocumentScreen({
  document,
  footer,
}: {
  document: LegalDocument;
  footer?: ReactNode;
}) {
  const { colors } = useTheme();

  return (
    <Screen scroll contentStyle={styles.content}>
      <View style={styles.lead}>
        <Text style={[styles.title, { color: colors.text }]}>{document.title}</Text>
        <Text style={[styles.caption, { color: colors.muted }]}>{document.caption}</Text>
      </View>

      {document.sections.map((section) => (
        <View key={section.title} style={styles.group}>
          <SectionHeader title={section.title} />
          <Card contentStyle={styles.cardBody}>
            {section.paragraphs.map((paragraph) => (
              <Text key={paragraph} style={[styles.paragraph, { color: colors.text }]}>
                {paragraph}
              </Text>
            ))}
            {section.links ? (
              <View style={styles.links}>
                {section.links.map((link) => (
                  <PressableScale
                    key={link.url}
                    onPress={() => void Linking.openURL(link.url)}
                    accessibilityRole="link"
                    accessibilityLabel={link.label}
                  >
                    <Text style={[styles.link, { color: colors.accent }]}>{link.label}</Text>
                  </PressableScale>
                ))}
              </View>
            ) : null}
          </Card>
        </View>
      ))}

      {footer}
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
  notice: {
    paddingHorizontal: spacing.xs,
  },
});
