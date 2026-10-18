import {
  AlarmClock,
  Battery,
  Bluetooth,
  Camera,
  Check,
  ChevronRight,
  Copy,
  Cpu,
  Gauge,
  HardDrive,
  House,
  Info,
  LayoutGrid,
  Lightbulb,
  MemoryStick,
  MonitorSmartphone,
  Moon,
  Nfc,
  Palette,
  Pause,
  Plane,
  Play,
  Radar,
  Search,
  Settings,
  Signal,
  Sun,
  Thermometer,
  TriangleAlert,
  Wifi,
  Wrench,
  X,
  Zap,
} from 'lucide-react-native';

import { useTheme } from '@/design-system/theme';

/** Central icon map — only the names listed here ship in the bundle. */
export const iconMap = {
  airplane: Plane,
  alarm: AlarmClock,
  alert: TriangleAlert,
  apps: LayoutGrid,
  battery: Battery,
  bluetooth: Bluetooth,
  camera: Camera,
  check: Check,
  'chevron-right': ChevronRight,
  copy: Copy,
  cpu: Cpu,
  display: MonitorSmartphone,
  gauge: Gauge,
  home: House,
  info: Info,
  memory: MemoryStick,
  moon: Moon,
  nfc: Nfc,
  palette: Palette,
  pause: Pause,
  play: Play,
  search: Search,
  sensors: Radar,
  settings: Settings,
  signal: Signal,
  storage: HardDrive,
  sun: Sun,
  thermometer: Thermometer,
  tips: Lightbulb,
  tools: Wrench,
  wifi: Wifi,
  x: X,
  zap: Zap,
} as const;

export type IconName = keyof typeof iconMap;

export type IconSize = 16 | 20 | 24;

type Props = {
  name: IconName;
  size?: IconSize;
  /** Defaults to the current theme text colour. */
  color?: string;
};

/**
 * The one icon component in the app: consistent 2 px stroke, 16/20/24 dp.
 */
export function Icon({ name, size = 20, color }: Props) {
  const { colors } = useTheme();
  const Component = iconMap[name];
  return <Component size={size} color={color ?? colors.text} strokeWidth={2} />;
}
