import { registerWebModule, NativeModule } from 'expo';

// DeviceStatsModule is not available on the web platform.
class DeviceStatsModule extends NativeModule<Record<string, never>> {}

export default registerWebModule(DeviceStatsModule, 'DeviceStatsModule');
