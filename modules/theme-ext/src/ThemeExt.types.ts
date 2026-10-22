/**
 * Android 12's dynamic-colour tonal palette. Four readable tones are enough
 * for Device Matrix: an accent for each scheme and a companion tone for
 * gradients and charts. Values are `#RRGGBB`.
 */
export type NativeSystemAccentPalette = {
  accentDark: string;
  accentLight: string;
  secondaryDark: string;
  secondaryLight: string;
};
