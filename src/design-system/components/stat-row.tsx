import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/design-system/animations/pressable-scale';
import { copyValue } from '@/design-system/copy/copy-value';
import { Icon } from '@/design-system/icon';
import { useTheme } from '@/design-system/theme';
import { spacing, typography } from '@/design-system/tokens';

type Props = {
  label: string;
  value: string;
  /** Long-press copies the value (default on). */
  copyable?: boolean;
};

/** The shared marker is not a reading, so it never becomes a copy target. */
const NOT_AVAILABLE = 'Not available on this device';

/** Label left, value right — long-press copies the value with haptic feedback. */
export function StatRow({ label, value, copyable = true }: Props) {
  const { colors } = useTheme();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canCopy = copyable && value.trim().length > 0 && value !== NOT_AVAILABLE;

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const handleLongPress = async () => {
    if (!canCopy) return;
    const copied = await copyValue(value, label);
    if (!copied) return;
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1200);
  };

  return (
    <PressableScale
      haptic={false}
      onLongPress={canCopy ? handleLongPress : undefined}
      delayLongPress={320}
      accessibilityRole="text"
      accessibilityLabel={`${label}: ${value}`}
      accessibilityHint={canCopy ? 'Long press to copy the value' : undefined}
      style={styles.row}
    >
      <Text numberOfLines={1} style={[styles.label, { color: colors.muted }]}>
        {label}
      </Text>
      <View style={styles.valueWrap}>
        {copied ? <Icon name="check" size={16} color={colors.good} /> : null}
        <Text numberOfLines={1} style={[styles.value, { color: colors.text }]}>
          {value}
        </Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    minHeight: 48,
    paddingVertical: spacing.sm,
  },
  label: {
    ...typography.body,
    flexShrink: 1,
  },
  valueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 1,
  },
  value: {
    ...typography.mono,
    textAlign: 'right',
    flexShrink: 1,
  },
});
