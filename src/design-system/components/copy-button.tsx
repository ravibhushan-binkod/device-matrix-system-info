import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Pressable } from 'react-native';

import { Icon } from '@/design-system/icon';
import { useTheme } from '@/design-system/theme';

type Props = {
  /** Text written to the clipboard. */
  value: string;
  /** Spoken label, e.g. "Copy package name". */
  label: string;
  size?: 16 | 20;
};

/** Small copy icon button with a brief check confirmation. */
export function CopyButton({ value, label, size = 16 }: Props) {
  const { colors } = useTheme();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copy = async () => {
    try {
      await Clipboard.setStringAsync(value);
    } catch {
      // The clipboard can be unavailable; the button stays harmless.
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1200);
  };

  return (
    <Pressable
      onPress={() => void copy()}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Copies the value"
      hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      <Icon
        name={copied ? 'check' : 'copy'}
        size={size}
        color={copied ? colors.good : colors.muted}
      />
    </Pressable>
  );
}
