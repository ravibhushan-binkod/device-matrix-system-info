/**
 * Text for the About, Privacy, Terms and Disclaimer screens.
 *
 * The same wording is published as static HTML in `docs/legal/` for the store
 * listing URLs. Every value the app can actually read is described here — the
 * screens must never claim more than the code does.
 */

export type LegalLink = {
  label: string;
  url: string;
};

export type LegalSection = {
  title: string;
  paragraphs: string[];
  links?: LegalLink[];
};

export type LegalDocument = {
  title: string;
  caption: string;
  sections: LegalSection[];
};

/** Shown on every legal document until a lawyer has reviewed it. */
export const LEGAL_REVIEW_NOTICE =
  'This text is a plain-language draft and has not been reviewed by a lawyer.';

export const ABOUT_CAPTION = 'Device Matrix: System Info · all readings stay on this phone.';

const LAST_UPDATED = 'Last updated: 21 October 2026.';

export const PRIVACY_POLICY: LegalDocument = {
  title: 'Privacy policy',
  caption: ABOUT_CAPTION,
  sections: [
    {
      title: 'What the app reads',
      paragraphs: [
        'Device Matrix reads information about your phone — model and build, Android version, CPU and GPU, memory, storage, battery, thermal state, display, camera and sensor capabilities, network and Wi-Fi details, and the launcher apps Android reports.',
        'Everything is read through public Android APIs on this phone. When Android or the manufacturer does not expose a value, the app shows “Not available on this device” instead of guessing.',
      ],
    },
    {
      title: 'What the app never reads',
      paragraphs: [
        'The app never reads your IMEI, hardware serial number, Android ID, phone number, MAC address or precise location. Those identifiers are not required for any reading it shows.',
        'The app’s own code never reads the advertising ID. The Google Mobile Ads SDK may access it for advertising, as described in the Advertising section below.',
        'Wi-Fi network names (SSID) and MAC-style BSSID values that Android reports for the connected or nearby networks are shown only when you open those sections, and are hidden by default — see “Sensitive values” below.',
      ],
    },
    {
      title: 'What stays on your phone',
      paragraphs: [
        'No account is required. The app has no backend, no cloud storage, no analytics and no crash-reporting service. Readings and app lists are not uploaded.',
        'Theme, accent, unit choices, dashboard choices, saved hardware-test results and your ads consent state are stored only in the app’s private storage. Clearing the app’s data or uninstalling the app removes them.',
        'A report you create is built on this phone. Text leaves only when you tap Copy or Share, and a PDF leaves only through Android’s share sheet.',
      ],
    },
    {
      title: 'Sensitive values',
      paragraphs: [
        'Settings → Privacy → “Hide sensitive values” is on by default. While it is on, the app masks Wi-Fi names (SSID), BSSID values, IP addresses, the gateway, DNS servers, the Android build fingerprint and nearby Wi-Fi names.',
        'A masked value can be revealed for ten seconds by tapping it. Copying is only possible while the value is revealed.',
        'Text and PDF reports leave identifying details (Wi-Fi names, BSSID, IP addresses, DNS and the fingerprint) out by default. A separate “Include identifying details” switch is off by default and shows a warning when you turn it on for a single export.',
      ],
    },
    {
      title: 'Home-screen widget',
      paragraphs: [
        'The optional home-screen widget reads the battery, memory and storage values on this phone and shows them in the launcher. Nothing leaves the device.',
        'Your temperature and storage-unit choices are written to the app’s private storage on the phone so the widget can format those numbers the same way the app does.',
      ],
    },
    {
      title: 'Advertising',
      paragraphs: [
        'The app shows ads served by Google AdMob. To serve ads, Google’s Mobile Ads SDK may access your device’s advertising ID and basic device and app information, and may collect diagnostics and approximate location as described in Google’s own policies.',
        'Where required by law (for example in the EEA and the UK), the app asks for your consent through Google’s consent form before any ad is requested. You can change or withdraw that choice any time in Settings → Privacy → Ad privacy options.',
        'How Google uses data: policies.google.com/technologies/partner-sites and policies.google.com/privacy. You can reset or delete your Android advertising ID in Android Settings → Privacy → Ads.',
      ],
      links: [
        {
          label: 'Google partner sites policy',
          url: 'https://policies.google.com/technologies/partner-sites',
        },
        { label: 'Google privacy policy', url: 'https://policies.google.com/privacy' },
      ],
    },
    {
      title: 'Permissions',
      paragraphs: [
        'Internet and network state are used for ads. Vibration is used by haptic feedback. Set-alarm is used only when you create an alarm or timer. NFC is read-only and used only when you open that information. Modify-audio-settings is used only by the earpiece test.',
        'Location is requested only when you open Wi-Fi details or the Wi-Fi analyzer, because Android treats Wi-Fi network names and nearby-network scans as location data. Nearby Wi-Fi Devices is used only for the Android 13+ nearby-network list. Bluetooth Connect is requested only to read whether Bluetooth is on.',
        'Usage Access is optional and is opened from Android’s special-access settings. It is used only for the Apps tab’s sizes, screen time and permission analysis. The app never asks for contacts, SMS, camera, microphone or overlay permissions, and it never scans for or connects to Bluetooth devices.',
      ],
    },
    {
      title: 'Children',
      paragraphs: [
        'The app is intended for a general audience aged 13 and older. It is not directed at children under 13, and it does not knowingly collect personal information from anyone.',
      ],
    },
    {
      title: 'Your choices',
      paragraphs: [
        'You can deny or revoke location, Nearby Wi-Fi Devices, Bluetooth Connect and Usage Access at any time in Android Settings. The app keeps working and shows “Not available on this device” for readings that need the permission.',
        'You can turn sensitive-value masking off in Settings → Privacy, but the app recommends leaving it on. You can reset or withdraw your ads consent in Settings → Privacy → Ad privacy options where Google requires a consent choice, and you can reset your advertising ID in Android Settings.',
      ],
    },
    {
      title: 'Contact',
      paragraphs: [
        'Questions about this policy: use the developer contact shown on the Device Matrix: System Info Google Play listing.',
        LAST_UPDATED,
      ],
    },
  ],
};

export const TERMS_OF_USE: LegalDocument = {
  title: 'Terms of use',
  caption: 'Please read these terms before relying on a reading.',
  sections: [
    {
      title: 'What this app is',
      paragraphs: [
        'Device Matrix: System Info shows information that your phone reports about itself: hardware, Android build, CPU and GPU, memory, storage, battery, thermal state, display, camera, sensors and networks. It is a viewer for readings Android exposes, not a service.',
        'The app runs entirely on your device. There is no account, no subscription and no server that stores your data.',
      ],
    },
    {
      title: 'Informational use only',
      paragraphs: [
        'Everything the app shows is for information and curiosity. It is not a diagnostic tool, a repair tool, a medical device or a professional measurement instrument.',
        'Do not use the app to make safety-critical decisions — for example about battery safety, charging, heat, repairs or warranty claims. For those questions, follow the manufacturer’s instructions or contact a qualified professional.',
      ],
    },
    {
      title: 'No warranty',
      paragraphs: [
        'The app is provided “as is” and “as available”, without warranties of any kind, whether express or implied, including fitness for a particular purpose and accuracy.',
        'Some values are estimates and are labelled as such. Some values are unavailable on some phones because Android or the manufacturer blocks them; the app shows “Not available on this device” rather than inventing a value.',
      ],
    },
    {
      title: 'Advertising',
      paragraphs: [
        'Ads are served by Google AdMob. Your use of the ads is also subject to Google’s policies. Where the law requires it, the app asks for consent before ads are requested.',
      ],
    },
    {
      title: 'Acceptable use',
      paragraphs: [
        'Use the app only on devices you own or are allowed to inspect. Do not use it to mislead anyone about a device’s condition or specifications.',
        'The app, its text and its artwork remain the property of their respective owners. Open-source components are used under their own licences, listed in About → Open-source licences.',
      ],
    },
    {
      title: 'Brand names',
      paragraphs: [
        'Android, Google, AdMob and the names of device makers, chipset makers and GPU families are trademarks or registered trademarks of their respective owners. The app uses them only to identify the hardware and software that reported a reading.',
      ],
    },
    {
      title: 'Changes',
      paragraphs: [
        'These terms may be updated when the app changes. The current text is always available in Settings → About → Terms of use, and the date below shows when it last changed.',
        LAST_UPDATED,
      ],
    },
    {
      title: 'Contact',
      paragraphs: [
        'Questions about these terms: use the developer contact shown on the Device Matrix: System Info Google Play listing.',
      ],
    },
  ],
};

/**
 * The trademark sentence required for brand assets. It must appear verbatim on
 * the Disclaimer screen (see docs/BRAND_ASSETS.md).
 */
export const TRADEMARK_NOTICE =
  'All brand names and marks are trademarks or registered trademarks of their respective owners. Device Matrix uses them only to identify the hardware and software that reported the reading, with no endorsement or affiliation implied.';

export const DISCLAIMER: LegalDocument = {
  title: 'Disclaimer',
  caption: 'How to read the numbers on these screens.',
  sections: [
    {
      title: 'Android varies by device',
      paragraphs: [
        'Android exposes different readings on different phones, brands and Android versions. A value visible on one phone can be hidden on another, and a label can mean slightly different things on different ROMs.',
        'Where a value is hidden, the app shows “Not available on this device”. It never fills the gap with an estimate unless the value is explicitly labelled as an estimate.',
      ],
    },
    {
      title: 'Estimated values',
      paragraphs: [
        'Some values cannot be measured exactly by a normal app and are shown as estimates: device age (from the build date and the Android version it shipped with), battery health percentage (from Android’s own counters) and the Home health score (calculated on this phone from the checks it could read).',
        'Each estimate says so on screen. Treat it as a hint, not as a measurement.',
      ],
    },
    {
      title: 'Informational use only',
      paragraphs: [
        'The app is for information. It is not a diagnostic, repair or safety instrument, and nothing it shows should be used to decide whether a device is safe to use, charge or sell.',
        'The Home health score is a rough summary, not a verdict. A low score does not mean the phone is faulty, and a high score does not mean it is healthy.',
      ],
    },
    {
      title: 'No battery-health or safety guarantee',
      paragraphs: [
        'The battery readings come from the values Android exposes on this phone. They are not a laboratory measurement, and they cannot predict when a battery will age further or fail.',
        'No reading in this app guarantees that a battery, charger or device is safe. Batteries can fail regardless of what software reports. Follow the manufacturer’s charging and safety instructions.',
      ],
    },
    {
      title: 'Trademarks',
      paragraphs: [TRADEMARK_NOTICE],
    },
  ],
};
