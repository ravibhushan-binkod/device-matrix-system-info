import { useCallback, useEffect, useRef, useState } from 'react';

import { copyValue } from '@/design-system/copy/copy-value';
import { useSettingsStore } from '@/state/settings-store';

/** The single mask used everywhere a sensitive value is hidden. */
export const MASKED_VALUE = '••••••••';

/** How long a tap reveals a masked value before it hides again. */
export const REVEAL_WINDOW_MS = 10_000;

const NOT_AVAILABLE = 'Not available on this device';

export type SensitiveValueState = {
  /** The value is masked right now. */
  hidden: boolean;
  /** The value can be revealed and copied. */
  hasValue: boolean;
  /** `MASKED_VALUE` while hidden, the raw value otherwise. */
  displayValue: string;
  /** Tap handler: reveals for 10 s, or hides again when already revealed. */
  reveal: () => void;
  /** Copies only while the value is visible. */
  copy: () => void;
};

/**
 * Shared masking behaviour for sensitive readings (SSID, BSSID, IPs, gateway,
 * DNS, build fingerprint, nearby network names). The preference defaults to
 * hidden and every consumer reveals for the same 10-second window, so screens
 * cannot invent their own rules.
 */
export function useSensitiveValue(
  value: string | null | undefined,
  label?: string,
  enabled = true,
): SensitiveValueState {
  const hideSensitiveValues = useSettingsStore((state) => state.hideSensitiveValues);
  const [revealed, setRevealed] = useState(false);
  const [hiddenSetting, setHiddenSetting] = useState(hideSensitiveValues);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = enabled;

  // Changing the setting immediately re-hides anything that was revealed.
  // Adjusting during render (React's "derived state" pattern) avoids an extra
  // hidden→visible→hidden frame that an effect would produce.
  if (hiddenSetting !== hideSensitiveValues) {
    setHiddenSetting(hideSensitiveValues);
    setRevealed(false);
  }

  const clearTimer = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  useEffect(() => () => clearTimer(), [clearTimer]);

  useEffect(() => {
    if (hideSensitiveValues) clearTimer();
  }, [hideSensitiveValues, clearTimer]);

  const raw = value?.trim();
  const hasValue = raw != null && raw.length > 0 && raw !== NOT_AVAILABLE;
  const hidden = active && hideSensitiveValues && !revealed;
  const displayValue = hasValue ? (hidden ? MASKED_VALUE : raw) : '';

  const reveal = useCallback(() => {
    if (!active || !hideSensitiveValues || !hasValue) return;
    if (revealed) {
      clearTimer();
      setRevealed(false);
      return;
    }
    setRevealed(true);
    clearTimer();
    timer.current = setTimeout(() => {
      timer.current = null;
      setRevealed(false);
    }, REVEAL_WINDOW_MS);
  }, [active, hideSensitiveValues, hasValue, revealed, clearTimer]);

  const copy = useCallback(() => {
    if (!hasValue || hidden) return;
    void copyValue(raw, label);
  }, [hasValue, hidden, raw, label]);

  return { hidden, hasValue, displayValue, reveal, copy };
}
