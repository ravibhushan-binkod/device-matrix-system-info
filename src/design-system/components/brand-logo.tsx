import { Image, StyleSheet, View } from 'react-native';

/**
 * The one Device Matrix mark. It is the existing transparent adaptive-icon
 * foreground, cropped to its visible DM artwork — never redrawn or replaced.
 */
const APP_LOGO = require('../../../assets/images/android-icon-foreground.png');

type Props = {
  /** Square size in points. */
  size?: number;
  /** Hide the spoken label when a parent already names the app. */
  decorative?: boolean;
};

export function AppLogo({ size = 32, decorative = false }: Props) {
  const art = Math.round(size * 1.55);
  const offset = Math.round((size - art) / 2);

  return (
    <View
      accessible={!decorative}
      accessibilityRole={decorative ? undefined : 'image'}
      accessibilityLabel={decorative ? undefined : 'Device Matrix logo'}
      importantForAccessibility={decorative ? 'no' : 'yes'}
      style={[styles.frame, { width: size, height: size }]}
    >
      <Image
        source={APP_LOGO}
        accessible={false}
        resizeMode="contain"
        style={{ position: 'absolute', width: art, height: art, left: offset, top: offset }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
  },
});
