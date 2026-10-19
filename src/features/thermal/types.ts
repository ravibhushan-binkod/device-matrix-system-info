import type { StatusTone } from '@/design-system/status';

export type ThermalZoneRow = {
  key: string;
  /** Zone name as the kernel reports it, e.g. "battery". */
  name: string;
  /** Formatted temperature; `null` when only the name was readable. */
  temperature: string | null;
};

export type ThermalInfo = {
  /** e.g. "Normal", "Light"; `null` when the status is unknown. */
  statusLabel: string | null;
  /** Tone for the status chip (good / warning / critical). */
  tone: StatusTone;
  /** 0–100 thermal load derived from Android's headroom; `null` when unavailable. */
  loadPercent: number | null;
  headroomPercent: number | null;
  batteryTemperatureC: number | null;
  /** Readable thermal zones from /sys/class/thermal (possibly empty). */
  zones: ThermalZoneRow[];
  /** Why the zone list is empty or blocked; `null` when zones were read. */
  zonesNote: string | null;
};
