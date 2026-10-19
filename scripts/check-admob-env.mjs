#!/usr/bin/env node
/**
 * Pre-flight check for `npm run build:release`.
 *
 * Release builds use Google's demo ad units and the sample AdMob app ID
 * whenever the live IDs are missing (src/core/ads/config.ts). That is safe
 * but wrong for production, so print a loud warning listing what is missing.
 * The build continues on purpose — this is a warning, not a gate.
 *
 * Env names mirror ADMOB_ENV_VARS in src/core/ads/config.ts.
 */
const REQUIRED = [
  ['EXPO_PUBLIC_ADMOB_ANDROID_APP_ID', 'AdMob app ID (Android)'],
  ['EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID', 'banner ad unit'],
  ['EXPO_PUBLIC_ADMOB_INTERSTITIAL_UNIT_ID', 'interstitial ad unit'],
  ['EXPO_PUBLIC_ADMOB_NATIVE_UNIT_ID', 'native ad unit'],
];

const missing = REQUIRED.filter(([name]) => (process.env[name] ?? '').trim() === '');

if (missing.length > 0) {
  const line = '='.repeat(78);
  console.warn('');
  console.warn(line);
  console.warn('  WARNING: THIS RELEASE BUILD WILL SHIP GOOGLE TEST ADS');
  console.warn(line);
  for (const [name, label] of missing) {
    console.warn(`  missing  ${name}  (${label})`);
  }
  console.warn('  Falling back to Google demo units / the sample app ID.');
  console.warn('  Set every variable (docs/RELEASE.md) for a production build.');
  console.warn(line);
  console.warn('');
}
