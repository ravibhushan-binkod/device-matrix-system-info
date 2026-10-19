import { registerWebModule, NativeModule } from 'expo';

// BatteryExtModule is not available on the web platform.
class BatteryExtModule extends NativeModule<Record<string, never>> {}

export default registerWebModule(BatteryExtModule, 'BatteryExtModule');
