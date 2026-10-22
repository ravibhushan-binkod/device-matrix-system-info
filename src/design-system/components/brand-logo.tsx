import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { withAlpha } from '@/design-system/color';
import { useTheme } from '@/design-system/theme';
import { BRAND_LOGO_PATHS } from '@/core/brand/brand-logos';
import type { BrandMark } from '@/core/brand/detect-brand';

type Props = {
  mark: BrandMark | null;
  /** Square size in points. */
  size?: number;
  /** Tint; defaults to the theme text colour for a neutral mark. */
  color?: string;
};

/**
 * Draws one brand mark in a single colour: a licensed vector path when the
 * brand has one, otherwise a neutral initials badge. Renders nothing when
 * detection found no brand — the UI never invents a mark.
 */
export function BrandLogo({ mark, size = 20, color }: Props) {
  const { colors } = useTheme();
  const tint = color ?? colors.text;

  if (mark == null) return null;

  if (mark.kind === 'logo') {
    return (
      <View accessible accessibilityRole="image" accessibilityLabel={`${mark.name} logo`}>
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d={BRAND_LOGO_PATHS[mark.slug]} fill={tint} />
        </Svg>
      </View>
    );
  }

  return (
    <View
      accessible
      accessibilityLabel={`${mark.name} badge`}
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          borderRadius: Math.round(size / 3),
          borderColor: withAlpha(tint, 0.35),
          backgroundColor: withAlpha(tint, 0.1),
        },
      ]}
    >
      <Text
        allowFontScaling={false}
        style={[styles.initials, { color: tint, fontSize: Math.round(size * 0.36) }]}
      >
        {mark.initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.2,
  },
});
