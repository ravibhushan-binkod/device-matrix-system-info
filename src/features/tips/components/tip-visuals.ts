import type { IconName } from '@/design-system/icon';
import type { AppColors } from '@/design-system/tokens';
import type { TipId, TipSeverity } from '@/features/tips/types';

const TIP_ICONS: Record<TipId, IconName> = {
  storage: 'storage',
  memory: 'memory',
  uptime: 'clock',
  'battery-temperature': 'thermometer',
  'battery-health': 'battery',
  'battery-low': 'battery',
  'display-refresh-rate': 'display',
  'display-timeout': 'display',
  'display-brightness': 'sun',
  'developer-animation': 'play',
  'developer-usb': 'tools',
  'wifi-band': 'wifi',
  'wifi-signal': 'signal',
  'security-patch': 'alert',
};

const SEVERITY_TONES: Record<TipSeverity, 'accent' | 'warning' | 'critical'> = {
  critical: 'critical',
  warning: 'warning',
  tip: 'accent',
};

/** Icon for a tip card — exhaustive over the tip ids. */
export function tipIcon(id: TipId): IconName {
  return TIP_ICONS[id];
}

/** Design-system tone for a tip severity (also the `TipCard` tone). */
export function tipTone(severity: TipSeverity): 'accent' | 'warning' | 'critical' {
  return SEVERITY_TONES[severity];
}

/** Theme colour for a tip severity. */
export function tipColor(colors: AppColors, severity: TipSeverity): string {
  return colors[SEVERITY_TONES[severity]];
}
