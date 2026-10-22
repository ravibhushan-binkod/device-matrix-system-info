import { StyleSheet, Text, View } from 'react-native';

import { CopyButton } from '@/design-system/components/copy-button';
import { CopyableText } from '@/design-system/components/copyable-text';
import { useTheme } from '@/design-system/theme';
import { spacing, typography } from '@/design-system/tokens';

type Props = {
  label: string;
  value: string;
  /** Monospace value (package names, fingerprints, ABIs); default on. */
  mono?: boolean;
  /** Let the value wrap onto several lines (fingerprints, component names). */
  multiline?: boolean;
};

/** Label + value with a visible copy button — the app-detail building block. */
export function CopyRow({ label, value, mono = true, multiline = false }: Props) {
  const { colors } = useTheme();

  return (
    <View style={styles.row}>
      <Text numberOfLines={1} style={[styles.label, { color: colors.muted }]}>
        {label}
      </Text>
      <View style={styles.valueWrap}>
        <CopyableText
          value={value}
          copyLabel={label}
          numberOfLines={multiline ? undefined : 2}
          style={[
            mono ? styles.mono : styles.valueText,
            { color: colors.text },
            multiline && styles.multiline,
          ]}
        >
          {value}
        </CopyableText>
        <CopyButton value={value} label={label} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    minHeight: 48,
    paddingVertical: spacing.sm,
  },
  label: {
    ...typography.body,
    flexShrink: 1,
    paddingTop: 1,
  },
  valueWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    flexShrink: 1,
    maxWidth: '68%',
  },
  mono: {
    ...typography.mono,
    textAlign: 'right',
    flexShrink: 1,
  },
  valueText: {
    ...typography.body,
    textAlign: 'right',
    flexShrink: 1,
  },
  multiline: {
    textAlign: 'left',
  },
});
