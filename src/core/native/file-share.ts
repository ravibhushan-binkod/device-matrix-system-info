import * as Sharing from 'expo-sharing';

import { ok, unavailable, type Result } from '@/core/result';

/**
 * Hands a local file to Android's share sheet. The caller has already copied
 * the file into this app's cache; nothing leaves the phone unless the user
 * picks a destination in the system sheet.
 */
export async function shareFile(
  uri: string,
  mimeType: string,
  dialogTitle: string,
): Promise<Result<boolean>> {
  try {
    if (!(await Sharing.isAvailableAsync())) {
      return unavailable('Sharing is not available on this device.');
    }
    await Sharing.shareAsync(uri, { mimeType, dialogTitle });
    return ok(true);
  } catch {
    return unavailable('The share sheet could not be opened.');
  }
}
