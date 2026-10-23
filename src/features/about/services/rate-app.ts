import { Alert, Linking } from 'react-native';

const MARKET_URL = 'market://details?id=com.binkod.devicematrix';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.binkod.devicematrix';

/**
 * Opens the Play Store page for this exact package. The market:// link is tried
 * first so the installed Play Store app opens directly; the HTTPS URL is the
 * browser/store fallback. Nothing is sent by this app — Android hands the link
 * to the store.
 */
export async function rateApp(): Promise<void> {
  try {
    await Linking.openURL(MARKET_URL);
    return;
  } catch {
    // Some devices block unlisted schemes; the HTTPS store URL is the fallback.
  }

  try {
    await Linking.openURL(PLAY_STORE_URL);
  } catch {
    Alert.alert(
      'Play Store unavailable',
      'The Play Store could not be opened. Device Matrix may not be published on Google Play yet, or no browser is available on this device.',
    );
  }
}
