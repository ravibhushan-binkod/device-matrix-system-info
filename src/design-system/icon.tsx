import {
  AlarmClock,
  Battery,
  BatteryCharging,
  Bluetooth,
  Camera,
  Check,
  ChevronRight,
  Clock,
  Copy,
  Cpu,
  Ear,
  FileText,
  FingerprintPattern,
  Flashlight,
  Gauge,
  HardDrive,
  Headphones,
  House,
  Info,
  LayoutGrid,
  Lightbulb,
  MemoryStick,
  Mic,
  Minus,
  MonitorSmartphone,
  Moon,
  Move3d,
  Nfc,
  Palette,
  Pause,
  Plane,
  Play,
  Plus,
  Pointer,
  Radar,
  RefreshCw,
  Search,
  Settings,
  Share2,
  Signal,
  Speaker,
  Sun,
  Thermometer,
  Timer,
  TriangleAlert,
  Vibrate,
  Volume2,
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
  charging: BatteryCharging,
  check: Check,
  'chevron-right': ChevronRight,
  clock: Clock,
  copy: Copy,
  cpu: Cpu,
  display: MonitorSmartphone,
  earpiece: Ear,
  flashlight: Flashlight,
  fingerprint: FingerprintPattern,
  gauge: Gauge,
  headphones: Headphones,
  home: House,
  info: Info,
  memory: MemoryStick,
  microphone: Mic,
  minus: Minus,
  moon: Moon,
  nfc: Nfc,
  palette: Palette,
  pause: Pause,
  play: Play,
  plus: Plus,
  pointer: Pointer,
  report: FileText,
  refresh: RefreshCw,
  search: Search,
  sensors: Radar,
  settings: Settings,
  share: Share2,
  signal: Signal,
  speaker: Speaker,
  storage: HardDrive,
  sun: Sun,
  thermometer: Thermometer,
  tilt: Move3d,
  timer: Timer,
  tips: Lightbulb,
  tools: Wrench,
  vibrate: Vibrate,
  volume: Volume2,
  wifi: Wifi,
  wrench: Wrench,
  x: X,
  zap: Zap,
} as const;

export type IconName = keyof typeof iconMap;

export type IconSize = 16 | 20 | 24 | 32 | 40 | 48 | 56 | 60;

type Props = {
  name: IconName;
  size?: IconSize;
  /** Defaults to the current theme text colour. */
  color?: string;
};

/**
 * The one icon component in the app: consistent 2 px stroke. 16/20/24 dp are
 * the normal UI sizes; larger sizes are reserved for empty states and hero
 * visuals.
 */
export function Icon({ name, size = 20, color }: Props) {
  const { colors } = useTheme();
  const Component = iconMap[name];
  return <Component size={size} color={color ?? colors.text} strokeWidth={2} />;
}
