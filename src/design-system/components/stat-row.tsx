import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/design-system/animations/pressable-scale';
import { Icon } from '@/design-system/icon';
import { useTheme } from '@/design-system/theme';
import { spacing, typography } from '@/design-system/tokens';

type Props = {
  label: string;
  value: string;
  /** Long-press copies the value (default on). */
  copyable?: boolean;
};

/** Label left, value right — long-press copies the value with haptic feedback. */
export function StatRow({ label, value, copyable = true }: Props) {
  const { colors } = useTheme();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const handleLongPress = () => {
    if (!copyable) return;
    Clipboard.setStringAsync(value).catch(() => {});
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1200);
  };

  return (
    <PressableScale
      haptic={false}
      onLongPress={copyable ? handleLongPress : undefined}
      delayLongPress={320}
      accessibilityRole="text"
      accessibilityLabel={`${label}: ${value}`}
      accessibilityHint={copyable ? 'Long press to copy the value' : undefined}
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
