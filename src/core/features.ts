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
  nearbyWifi: 'v2',
  nfcTools: 'v2',
  localHistory: 'v2',
  /** The report's "Save as PDF" export (expo-print) — off in V1. */
  pdfReport: 'v2',
  /** Cross-cutting. */
  ads: 'v1',
} as const satisfies Record<string, unknown>;

export function isEnabled(flag: FeatureAvailability): boolean {
  return flag === 'v1';
}
