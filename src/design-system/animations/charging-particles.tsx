import { Circle } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

type Props = {
  x: number;
  y: number;
  width: number;
  height: number;
  /** 0..1 wave phase. */
  progress: SharedValue<number>;
  /** Current liquid level 0..1. */
  level: SharedValue<number>;
  color: string;
  count?: number;
  active?: boolean;
};

type ParticleProps = Omit<Props, 'count'> & { index: number; total: number };

function Particle({ x, y, width, height, progress, level, color, index, total }: ParticleProps) {
  const lane = (index * 0.37 + 0.11) % 1;
  const phase = (index * 0.23) % 1;

  const cx = useDerivedValue(() => {
    const sway = Math.sin(progress.value * Math.PI * 2 + index * 1.7) * 2.2;
    return x + width * (0.12 + lane * 0.76) + sway;
  });

  const cy = useDerivedValue(() => {
    const fill = Math.max(0, Math.min(1, level.value));
    if (fill <= 0.001) return y + height + 4;
    const surface = y + height * (1 - fill);
    const travel = Math.max(0, y + height - surface);
    const p = (progress.value + phase) % 1;
    return y + height - p * travel;
  });

  const opacity = useDerivedValue(() => {
    const fill = Math.max(0, Math.min(1, level.value));
    if (fill <= 0.001) return 0;
    const p = (progress.value + phase) % 1;
    return Math.min(1, p * 4, (1 - p) * 5) * 0.55;
  });

  const radius = useDerivedValue(() => 1.3 + ((index * 7) % 5) * 0.25);

  return <Circle cx={cx} cy={cy} r={radius} color={color} opacity={opacity} />;
}

/**
 * Rising bubbles inside the battery liquid. Rendered inside the battery's clip
 * group, so the particles never escape the shape. Only mounted while charging
 * and while motion is allowed.
 */
export function ChargingParticles(props: Props) {
  const { count = 7, active = true } = props;
  if (!active) return null;
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <Particle key={index} {...props} index={index} total={count} />
      ))}
    </>
  );
}
