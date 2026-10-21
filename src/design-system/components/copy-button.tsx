import { useEffect, useRef, useState } from 'react';
import { Pressable } from 'react-native';

import { copyValue } from '@/design-system/copy/copy-value';
import { Icon } from '@/design-system/icon';
import { useTheme } from '@/design-system/theme';

type Props = {
  /** Text written to the clipboard. */
  value: string;
  /** Noun used in the toast, e.g. "package name". */
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
    const copied = await copyValue(value, label);
    if (!copied) return;
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1200);
  };

  return (
    <Pressable
      onPress={() => void copy()}
      accessibilityRole="button"
      accessibilityLabel={`Copy ${label}`}
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
