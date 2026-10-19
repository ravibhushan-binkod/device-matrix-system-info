export type NativeBatteryInfo = {
  level: number;
  scale: number;
  percent: number | null;
  status: string;
  plugged: string;
  health: string;
  temperatureC: number | null;
  voltageMv: number | null;
  technology: string | null;
  currentNowUa: number | null;
  chargeCounterUah: number | null;
  cycleCount: number | null;
  powerSave: boolean;
};

export type NativeBatteryEvent = {
  onBatteryChanged: (info: NativeBatteryInfo) => void;
};
