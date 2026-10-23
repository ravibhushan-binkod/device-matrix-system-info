/**
 * Plain-language text for the About and Privacy screens.
 *
 * The same Privacy Policy wording is published in `docs/legal/privacy-policy.html`
 * for the store listing. Values here describe what the shipped app and manifest
 * actually do; never add a reading or permission that is not implemented.
 */
import { SUPPORT_EMAIL } from '@/core/app-info';

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

export const ABOUT_CAPTION = 'Device Matrix: System Info · all readings stay on this phone.';

export const TRADEMARK_NOTICE =
  'Android, Google, AdMob and the names of device makers, chipset makers and GPU families are trademarks or registered trademarks of their respective owners. Device Matrix uses them only to identify the hardware and software that reported the reading, with no endorsement or affiliation implied.';

/** Month and year only — the policy deliberately carries no version or day. */
export const PRIVACY_UPDATED = 'October 2026';

export const PRIVACY_POLICY: LegalDocument = {
  title: 'Privacy policy',
  caption: `Last updated ${PRIVACY_UPDATED} · ${ABOUT_CAPTION}`,
  sections: [
    {
      title: 'The short version',
      paragraphs: [
        'Device Matrix reads information about your phone on the phone itself. There is no account, no backend, no cloud storage and no analytics service. Your readings are not sent to us.',
        'The only network traffic is advertising served by Google AdMob. Google may use data for advertising as described below. You can manage ad choices where the law requires a choice.',
        'The app does not sell your personal data. It does not read your IMEI, hardware serial number, phone number, contacts, SMS or precise location.',
      ],
    },
    {
      title: 'What the app reads',
      paragraphs: [
        'Device Matrix reads what Android reports about the device and its software: model and build, Android version, CPU and GPU, memory, storage, battery and thermal state, display, camera and sensor capabilities, network and Wi-Fi details, installed-app sizes where Usage Access is granted, and the results of hardware checks you run.',
        'Readings use public Android interfaces available to normal apps. When Android or the manufacturer does not expose a value, the app shows “Not available on this device” instead of guessing or filling the gap with a silent estimate.',
        'Some values are clearly labelled estimates, for example device age and the battery-health percentage. The Home health score is calculated on this phone from the checks that could be read.',
      ],
    },
    {
      title: 'What stays on your phone',
      paragraphs: [
        'Theme, accent, unit choices, dashboard layout, saved hardware-test results and widget appearance are stored in the app’s private storage on this phone. Clearing the app’s data or uninstalling the app removes them.',
        'A report or checklist is built on this phone. Text leaves only when you tap Copy or Share, and a PDF leaves only through Android’s share sheet. You choose the destination.',
        'We do not operate a server that receives your readings. There is no crash-reporting or analytics SDK in this build.',
      ],
    },
    {
      title: 'Sensitive values and exports',
      paragraphs: [
        'Values that can identify a network or a build are always masked in the app. These include Wi-Fi names (SSID), BSSID values, IP addresses, the gateway, DNS servers, the Android build fingerprint and nearby Wi-Fi names. Masking cannot be switched off; a masked value can be revealed for a short time by tapping it, and copying is only possible while it is revealed.',
        'Exported text and PDF reports leave identifying details out by default. A single “Include identifying details” switch, off by default, can include them for one export after a warning.',
        'The microphone test reads live sound levels only to move a meter. Audio is never recorded to a file, stored or sent anywhere. The recorder is released when you leave the test or the app goes to the background.',
      ],
    },
    {
      title: 'Permissions and why they are needed',
      paragraphs: [
        'Internet, network state and Wi-Fi state are used for advertising and for network readings. The ads SDK may use the advertising ID through the Google-provided AD_ID permission.',
        'Vibration is used for haptics and the vibration test. Set-alarm is used only when you create an alarm or timer. NFC is read-only and used only when you open the NFC information. Modify-audio-settings is used only by the earpiece test.',
        'Location is requested only when you open Wi-Fi details or the Wi-Fi analyzer, because Android treats Wi-Fi names and nearby-network scans as location data. Nearby Wi-Fi Devices is used only for the Android 13+ nearby-network list. Bluetooth Connect is requested only to read whether Bluetooth is on; the app does not scan for or connect to Bluetooth devices.',
        'Microphone is requested only after you start the microphone test and confirm the explanation. You can deny it; the test then shows “Not tested” and a shortcut to system Settings.',
        'Usage Access is a special Android access that you choose to grant in Settings. It is used only for the Apps tab’s sizes, screen time and permission analysis. The app does not ask for contacts, SMS, phone state, camera, overlay or access to all installed packages.',
      ],
    },
    {
      title: 'Advertising and your choices',
      paragraphs: [
        'The app is free and supported by ads served by Google AdMob. To serve ads, Google’s Mobile Ads SDK may collect or receive your device’s advertising ID, basic device and app information, approximate location and diagnostics, as described in Google’s own privacy policy.',
        'Where required by law, for example in the EEA and the UK, the app asks for your consent through Google’s consent form before requesting an ad. You can change or withdraw that choice later. When Google reports that a privacy-options form is required, a “Manage ad choices” button appears at the end of this policy and opens Google’s form.',
        'You can reset or delete your Android advertising ID at any time in Android Settings → Privacy → Ads.',
      ],
      links: [
        {
          label: 'How Google uses data from partner sites and apps',
          url: 'https://policies.google.com/technologies/partner-sites',
        },
        { label: 'Google privacy policy', url: 'https://policies.google.com/privacy' },
      ],
    },
    {
      title: 'Home-screen widgets',
      paragraphs: [
        'Device Matrix can place home-screen widgets for RAM, storage, battery and a health summary. They read the same local values as the app and show them in your launcher. Nothing from a widget is uploaded.',
        'The storage unit and widget appearance choices are kept in the app’s private storage so widgets format sizes and colours consistently. Android and your launcher decide when a widget refreshes; the app requests an update about every 30 minutes. A widget may therefore show the values from its last update until the launcher refreshes it.',
        'Widgets cannot be added from inside the app. You add them from your launcher’s widget picker.',
      ],
    },
    {
      title: 'Children',
      paragraphs: [
        'Device Matrix is intended for a general audience aged 13 and older. It is not directed at children under 13, and it does not knowingly collect personal information from anyone.',
      ],
    },
    {
      title: 'Keeping and deleting data',
      paragraphs: [
        'Because there is no backend, there is no server-side copy of your readings to delete. Local settings, saved test results and widget preferences remain in the app’s private storage until you clear the app’s data or uninstall it. Reports you copied or shared are controlled by the app or service you sent them to.',
        'Android protects app-private storage, but no software can promise perfect security. Keep your phone and its screen lock up to date.',
      ],
    },
    {
      title: 'Changes to this policy',
      paragraphs: [
        `This policy is reviewed when the app changes. The month and year above show its latest revision; the app does not print a policy version or a day. If a change is material, the updated policy is published at this page and in the app before the change takes effect.`,
      ],
    },
    {
      title: 'Contact',
      paragraphs: [
        `Questions about this policy or the app: ${SUPPORT_EMAIL}. This is the support address configured for the build; the same developer contact appears on the Device Matrix: System Info Google Play listing.`,
      ],
    },
  ],
};
