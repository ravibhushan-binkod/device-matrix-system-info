import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/design-system/components/empty-state';
import type { IconName } from '@/design-system/icon';
import { useTheme } from '@/design-system/theme';
import { spacing, typography } from '@/design-system/tokens';

type Props = {
  icon: IconName;
  title: string;
  description: string;
  /** Small footer line, e.g. which phase fills this screen in. */
  note?: string;
  children?: ReactNode;
};

/**
 * The shared empty state every not-yet-built screen uses, so the shell feels
 * finished while the feature phases land one by one.
 */
export function PlaceholderScreen({ icon, title, description, note, children }: Props) {
  const { colors } = useTheme();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.surface, colors.background]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
        <View style={styles.body}>
          <EmptyState icon={icon} title={title} message={description} />
          {note ? <Text style={[styles.note, { color: colors.muted }]}>{note}</Text> : null}
          {children}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  note: {
    ...typography.mono,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginTop: spacing.sm,
  },
});
