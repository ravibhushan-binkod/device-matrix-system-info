import { StyleSheet, Text, View } from 'react-native';
import type { ReactNode } from 'react';

import { PressableScale } from '@/design-system/animations/pressable-scale';
import { CopyButton } from '@/design-system/components/copy-button';
import { Icon } from '@/design-system/icon';
import { useTheme } from '@/design-system/theme';
import { spacing, typography } from '@/design-system/tokens';

type Props = {
  title: string;
  /** Optional trailing element (link, count, chip). */
  action?: ReactNode;
  /** When set, a copy icon copies exactly this section text. */
  copyText?: string;
  /** Opens a "What this means" sheet; renders a small info button when set. */
  onInfo?: () => void;
};

/** Small uppercase section label with optional copy, action and info buttons. */
export function SectionHeader({ title, action, copyText, onInfo }: Props) {
  const { colors } = useTheme();

  return (
    <View style={styles.row}>
      <Text style={[styles.title, { color: colors.muted }]}>{title}</Text>
      <View style={styles.trailing}>
        {action}
        {copyText ? <CopyButton value={copyText} label={`${title} section`} /> : null}
        {onInfo ? (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={`What this means: ${title}`}
            hitSlop={8}
            haptic={false}
            onPress={onInfo}
            style={styles.info}
          >
            <Icon name="info" size={16} color={colors.muted} />
          </PressableScale>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  title: {
    ...typography.caption,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  info: {
    padding: 2,
  },
});
