import { NativeModule, requireNativeModule } from 'expo';

import type { NativeBatteryEvent, NativeBatteryInfo } from './BatteryExt.types';

declare class BatteryExtModule extends NativeModule<NativeBatteryEvent> {
  getBatteryInfo(): NativeBatteryInfo | null;
  startBatteryListener(): boolean;
  stopBatteryListener(): boolean;
}

export default requireNativeModule<BatteryExtModule>('BatteryExt');
