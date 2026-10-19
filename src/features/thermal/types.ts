import type { StatusTone } from '@/design-system/status';

export type ThermalInfo = {
  /** e.g. "Normal", "Light"; `null` when the status is unknown. */
  statusLabel: string | null;
  /** Tone for the status chip (good / warning / critical). */
  tone: StatusTone;
  /** 0–100 thermal load derived from Android's headroom; `null` when unavailable. */
  loadPercent: number | null;
  headroomPercent: number | null;
  batteryTemperatureC: number | null;
};
