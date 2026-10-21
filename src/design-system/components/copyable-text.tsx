import type { ReactNode } from 'react';
import { Text, type TextProps } from 'react-native';

import { copyValue } from '@/design-system/copy/copy-value';

type Props = TextProps & {
  /** The raw value copied on long press. Empty/missing values stay inert. */
  value: string | null | undefined;
  /** Short noun for the toast, e.g. "Model". */
  copyLabel?: string;
  children?: ReactNode;
};

/**
 * Long-press-to-copy wrapper for any visible value. It uses the same haptic
 * and toast as StatRow, so custom rows do not invent their own feedback.
 */
export function CopyableText({ value, copyLabel, children, onLongPress, ...rest }: Props) {
  const text = value?.trim();
  const canCopy = text != null && text.length > 0 && text !== 'Not available on this device';

  return (
    <Text
      {...rest}
      onLongPress={
        canCopy
          ? (event) => {
              void copyValue(text, copyLabel);
              onLongPress?.(event);
            }
          : onLongPress
      }
      accessibilityHint={canCopy ? 'Long press to copy this value' : rest.accessibilityHint}
      suppressHighlighting={false}
    >
      {children ?? value}
    </Text>
  );
}
