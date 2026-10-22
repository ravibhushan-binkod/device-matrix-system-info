import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

import { useCopyToastStore } from '@/state/copy-toast-store';

/**
 * Copies a reading and gives the one feedback model used across the app:
 * a success haptic plus the global toast. Empty and missing readings are
 * ignored — the caller keeps its own "Not available" label.
 */
export async function copyValue(
  value: string | null | undefined,
  label?: string,
): Promise<boolean> {
  const text = value?.trim();
  if (!text) return false;

  try {
    await Clipboard.setStringAsync(text);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    useCopyToastStore.getState().show(label ? `Copied · ${label}` : 'Copied to clipboard');
    return true;
  } catch {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    useCopyToastStore.getState().show('Could not copy');
    return false;
  }
}
