import Constants from 'expo-constants';

/**
 * Public support address for the policy and store listing. Set
 * `EXPO_PUBLIC_SUPPORT_EMAIL` at build time; the placeholder keeps the app
 * honest until a real address is configured.
 */
const configured = Constants.expoConfig?.extra?.supportEmail;

export const SUPPORT_EMAIL =
  typeof configured === 'string' && configured.trim().length > 0
    ? configured.trim()
    : 'support@example.com';

export const SUPPORT_EMAIL_IS_PLACEHOLDER = SUPPORT_EMAIL === 'support@example.com';
