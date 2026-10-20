/**
 * Feature flags for the V1 / V2 plan.
 *
 * A flag only decides whether a section is built or visible — it never changes
 * what a reading means, and nothing here may fake data for a disabled feature.
 */
export type FeatureAvailability = 'v1' | 'v2' | 'off';

export const features = {
  /** The information sections the app ships with. */
  sections: {
    device: 'v1',
    os: 'v1',
    cpuGpu: 'v1',
    memory: 'v1',
    storage: 'v1',
    battery: 'v1',
    thermal: 'v1',
    display: 'v1',
    camera: 'v1',
    sensors: 'v1',
    network: 'v1',
    apps: 'v1',
    tips: 'v1',
  },
  /** The Apps tab's usage insights (screen time, app sizes) — needs Usage
   * Access, which the user grants in system settings. */
  usageInsights: 'v1',
  /** Planned for V2. */
  speedTest: 'v2',
  /** The Wi-Fi analyzer (nearby networks) — built in 13D. */
  nearbyWifi: 'v1',
  nfcTools: 'v2',
  localHistory: 'v2',
  /** The report's "Save as PDF" export (expo-print) — off in V1. */
  pdfReport: 'v2',
  /** The APK extraction (copy an installed app's APK to the share sheet) —
   * implemented but deliberately off: it is not part of the shipped feature
   * set until a later phase turns it on. */
  apkExtraction: 'off',
  /** Cross-cutting. */
  ads: 'v1',
  /** Full-screen interstitials — built, but kept off until reviewed. */
  interstitialAds: 'off',
  /** Developer ad tools in Settings (reset consent, Ad Inspector, EEA test).
   * Flip to 'off' to hide them from users. */
  adDebugTools: 'v1',
} as const satisfies Record<string, unknown>;

export function isEnabled(flag: FeatureAvailability): boolean {
  return flag === 'v1';
}
