import {
  AlarmClock,
  Battery,
  Bluetooth,
  Camera,
  Check,
  ChevronRight,
  Clock,
  Copy,
  Cpu,
  FileText,
  Flashlight,
  Gauge,
  HardDrive,
  House,
  Info,
  LayoutGrid,
  Lightbulb,
  MemoryStick,
  Minus,
  MonitorSmartphone,
  Moon,
  Nfc,
  Palette,
  Pause,
  Plane,
  Play,
  Plus,
  Pointer,
  Radar,
  Search,
  Settings,
  Share2,
  Signal,
  Sun,
  Thermometer,
  Timer,
  TriangleAlert,
  Vibrate,
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
  clock: Clock,
  copy: Copy,
  cpu: Cpu,
  display: MonitorSmartphone,
  flashlight: Flashlight,
  gauge: Gauge,
  home: House,
  info: Info,
  memory: MemoryStick,
  minus: Minus,
  moon: Moon,
  nfc: Nfc,
  palette: Palette,
  pause: Pause,
  play: Play,
  plus: Plus,
  pointer: Pointer,
  report: FileText,
  search: Search,
  sensors: Radar,
  settings: Settings,
  share: Share2,
  signal: Signal,
  storage: HardDrive,
  sun: Sun,
  thermometer: Thermometer,
  timer: Timer,
  tips: Lightbulb,
  tools: Wrench,
  vibrate: Vibrate,
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
