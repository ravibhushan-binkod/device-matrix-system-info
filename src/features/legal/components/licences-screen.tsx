import { Linking, StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/design-system/animations/pressable-scale';
import { Card, Screen } from '@/design-system/components';
import { useTheme } from '@/design-system/theme';
import { spacing, typography } from '@/design-system/tokens';
import { LICENCES } from '@/features/legal/licences';

/**
 * Open-source licences: the direct runtime dependencies with their licences,
 * generated from the installed packages (npm run licences).
 */
export function LicencesScreen() {
  const { colors } = useTheme();

  return (
    <Screen scroll contentStyle={styles.content}>
      <View style={styles.lead}>
        <Text style={[styles.title, { color: colors.text }]}>Open-source licences</Text>
        <Text style={[styles.caption, { color: colors.muted }]}>
          The libraries and assets that ship inside this app.
        </Text>
      </View>

      <Card contentStyle={styles.cardBody}>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          Device Matrix is built with the open-source projects listed below. Transitive libraries
          are included inside these packages and keep their own licences; each project page links to
          the full licence text.
        </Text>
      </Card>

      <Card contentStyle={styles.list}>
        {LICENCES.map((entry, index) => (
          <View
            key={entry.name}
            style={[
              styles.row,
              index > 0 && {
                borderTopColor: colors.border,
                borderTopWidth: StyleSheet.hairlineWidth,
              },
            ]}
          >
            <View style={styles.rowText}>
              <Text numberOfLines={1} style={[styles.name, { color: colors.text }]}>
                {entry.name}
              </Text>
              <Text numberOfLines={1} style={[styles.meta, { color: colors.muted }]}>
                {entry.version} · {entry.licence}
              </Text>
            </View>
            {entry.homepage ? (
              <PressableScale
                onPress={() => void Linking.openURL(entry.homepage as string)}
                accessibilityRole="link"
                accessibilityLabel={`Open the ${entry.name} project page`}
                hitSlop={6}
              >
                <Text style={[styles.open, { color: colors.accent }]}>Open</Text>
              </PressableScale>
            ) : null}
          </View>
        ))}
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
  list: {
    gap: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  name: {
    ...typography.body,
  },
  meta: {
    ...typography.caption,
  },
  open: {
    ...typography.caption,
    fontFamily: 'Inter_600SemiBold',
  },
});
