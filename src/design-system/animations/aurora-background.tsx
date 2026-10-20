import { Canvas, Rect, Shader, Skia, useClock, type Uniforms } from '@shopify/react-native-skia';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import {
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useDerivedValue } from 'react-native-reanimated';

import { useMotionPreference } from '@/design-system/animations/use-motion-preference';
import { withAlpha } from '@/design-system/color';
import { useScreenFocused } from '@/design-system/hooks/use-screen-focused';
import { useTheme } from '@/design-system/theme';

type Props = {
  /** 0..1 — lets screens keep the glow subtle. */
  intensity?: number;
  style?: StyleProp<ViewStyle>;
};

const SKSL = `
uniform float2 uSize;
uniform float uTime;
uniform float uIntensity;
uniform float3 uAccent;
uniform float3 uViolet;

half4 main(float2 p) {
  float2 uv = p / max(uSize, float2(1.0));
  float t = uTime;
  float waveA = sin(uv.x * 3.4 + t * 0.16 + uv.y * 1.7);
  float waveB = cos(uv.y * 2.9 - t * 0.12 + uv.x * 2.1);
  float glowA = smoothstep(0.92, 0.02, distance(uv, float2(0.78 + waveA * 0.10, 0.18 + waveB * 0.08)));
  float glowB = smoothstep(0.82, 0.0, distance(uv, float2(0.12 + waveB * 0.08, 0.88 + waveA * 0.06)));
  float alphaA = glowA * 0.30 * uIntensity;
  float alphaB = glowB * 0.22 * uIntensity;
  float3 rgb = uAccent * alphaA + uViolet * alphaB;
  return half4(rgb, clamp(alphaA + alphaB, 0.0, 0.46));
}
`;

const EFFECT = Skia.RuntimeEffect.Make(SKSL);

function rgb(hex: string): [number, number, number] {
  const match = /^#([0-9a-fA-F]{6})$/.exec(hex);
  if (!match) return [1, 1, 1];
  const raw = match[1] ?? 'ffffff';
  return [
    Number.parseInt(raw.slice(0, 2), 16) / 255,
    Number.parseInt(raw.slice(2, 4), 16) / 255,
    Number.parseInt(raw.slice(4, 6), 16) / 255,
  ];
}

type AnimatedProps = {
  width: number;
  height: number;
  intensity: number;
  accent: string;
  violet: string;
};

function AnimatedAurora({ width, height, intensity, accent, violet }: AnimatedProps) {
  const clock = useClock();
  const [ar, ag, ab] = rgb(accent);
  const [vr, vg, vb] = rgb(violet);

  const uniforms = useDerivedValue<Uniforms>(() => ({
    uSize: [width, height],
    uTime: clock.value / 1000,
    uIntensity: intensity,
    uAccent: [ar, ag, ab],
    uViolet: [vr, vg, vb],
  }));

  if (!EFFECT) return null;

  return (
    <Canvas style={StyleSheet.absoluteFill}>
      <Rect x={0} y={0} width={width} height={height}>
        <Shader source={EFFECT} uniforms={uniforms} />
      </Rect>
    </Canvas>
  );
}

/**
 * The dashboard hero's slow aurora. The shader only mounts while the screen is
 * visible, the app is active and motion is Full; everything else falls back to
 * a static gradient, so the clock is not left running behind another screen.
 */
export function AuroraBackground({ intensity = 1, style }: Props) {
  const { colors } = useTheme();
  const focused = useScreenFocused();
  const { loops } = useMotionPreference();
  const [size, setSize] = useState({ width: 0, height: 0 });

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width !== size.width || height !== size.height) setSize({ width, height });
  };

  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, styles.root, style]}
      onLayout={onLayout}
    >
      <LinearGradient
        colors={[
          withAlpha(colors.accent, 0.09 * intensity),
          withAlpha(colors.violet, 0.055 * intensity),
          'transparent',
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {focused && loops && size.width > 0 && size.height > 0 ? (
        <AnimatedAurora
          width={size.width}
          height={size.height}
          intensity={intensity}
          accent={colors.accent}
          violet={colors.violet}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
  },
});
