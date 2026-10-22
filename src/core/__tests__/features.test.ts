import { features, isEnabled } from '../features';

describe('features', () => {
  it('enables every V1 information section', () => {
    for (const flag of Object.values(features.sections)) {
      expect(isEnabled(flag)).toBe(true);
    }
  });

  it('enables the Apps usage insights', () => {
    expect(isEnabled(features.usageInsights)).toBe(true);
  });

  it('enables the Wi-Fi analyzer from phase 13D', () => {
    expect(isEnabled(features.nearbyWifi)).toBe(true);
  });

  it('keeps V2 features disabled for V1', () => {
    expect(isEnabled(features.speedTest)).toBe(false);
    expect(isEnabled(features.nfcTools)).toBe(false);
    expect(isEnabled(features.localHistory)).toBe(false);
  });

  it('enables the PDF report from phase 13H', () => {
    expect(isEnabled(features.pdfReport)).toBe(true);
  });

  it('keeps interstitials off until they are reviewed', () => {
    expect(isEnabled(features.interstitialAds)).toBe(false);
  });

  it('enables the ads developer tools', () => {
    expect(isEnabled(features.adDebugTools)).toBe(true);
  });
});
