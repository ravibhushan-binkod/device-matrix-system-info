import { Text, type TextProps } from 'react-native';

import { MASKED_VALUE, useSensitiveValue } from '@/design-system/privacy/sensitive-value';

type Props = TextProps & {
  /** The raw value shown (or masked) by the component. */
  value: string | null | undefined;
  /** Short noun for the copy toast, e.g. "SSID". */
  copyLabel?: string;
  /** Shown when there is no value at all; never masked. */
  fallback?: string;
};

/**
 * Renders a sensitive reading (SSID, BSSID, IP, gateway, DNS, fingerprint or a
 * nearby network name). While Settings → Privacy → “Hide sensitive values” is
 * on, the value shows as dots and one tap reveals it for 10 seconds; long
 * press copies only while it is visible.
 */
export function SensitiveValue({
  value,
  copyLabel,
  fallback = '—',
  onPress,
  onLongPress,
  accessibilityLabel,
  ...rest
}: Props) {
  const { hidden, hasValue, displayValue, reveal, copy } = useSensitiveValue(value, copyLabel);

  return (
    <Text
      {...rest}
      onPress={(event) => {
        if (hidden && hasValue) {
          reveal();
          return;
        }
        onPress?.(event);
      }}
      onLongPress={(event) => {
        if (hidden) return;
        copy();
        onLongPress?.(event);
      }}
      accessibilityRole="text"
      accessibilityLabel={
        hidden && hasValue
          ? `${accessibilityLabel ?? copyLabel ?? 'Value'} hidden. Tap to reveal for 10 seconds.`
          : (accessibilityLabel ?? (hasValue ? displayValue : fallback))
      }
    >
      {hasValue ? displayValue : fallback}
    </Text>
  );
}

export { MASKED_VALUE };
