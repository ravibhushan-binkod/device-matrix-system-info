import { NativeModule, requireNativeModule } from 'expo';

import type { NativeSensorChangedEvent, NativeSensorDescriptor } from './SensorExt.types';

declare class SensorExtModule extends NativeModule<{
  onSensorChanged: (event: NativeSensorChangedEvent) => void;
}> {
  getSensors(): NativeSensorDescriptor[] | null;
  startSensor(type: number): boolean;
  stopSensor(): boolean;
}

export default requireNativeModule<SensorExtModule>('SensorExt');
