import type { ReactNode } from 'react';
import { Text, type TextProps } from 'react-native';

import { copyValue } from '@/design-system/copy/copy-value';
import { MASKED_VALUE, useSensitiveValue } from '@/design-system/privacy/sensitive-value';

type Props = TextProps & {
  /** The raw value copied on long press. Empty/missing values stay inert. */
  value: string | null | undefined;
  /** Short noun for the toast, e.g. "Model". */
  copyLabel?: string;
  /** Mask the value while Settings → Privacy → Hide sensitive values is on. */
  sensitive?: boolean;
  children?: ReactNode;
};

/**
 * Long-press-to-copy wrapper for any visible value. It uses the same haptic
 * and toast as StatRow, so custom rows do not invent their own feedback.
 * Sensitive values stay masked until the user taps to reveal them.
 */
export function CopyableText({
  value,
  copyLabel,
  sensitive = false,
  children,
  onLongPress,
  onPress,
  ...rest
}: Props) {
  const sensitiveState = useSensitiveValue(sensitive ? value : undefined, copyLabel);
  const text = value?.trim();
  const hidden = sensitive && sensitiveState.hidden && sensitiveState.hasValue;
  const canCopy =
    !hidden && text != null && text.length > 0 && text !== 'Not available on this device';

  return (
    <Text
      {...rest}
      onPress={(event) => {
        if (hidden) {
          sensitiveState.reveal();
          return;
        }
        onPress?.(event);
      }}
      onLongPress={
        hidden
          ? undefined
          : canCopy
            ? (event) => {
                void copyValue(text, copyLabel);
                onLongPress?.(event);
              }
            : onLongPress
      }
      accessibilityLabel={hidden ? 'Hidden value. Tap to reveal for 10 seconds.' : undefined}
    >
      {hidden ? MASKED_VALUE : children}
    </Text>
  );
}
