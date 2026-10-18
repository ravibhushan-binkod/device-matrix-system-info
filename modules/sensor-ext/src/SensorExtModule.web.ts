import { registerWebModule, NativeModule } from 'expo';

// SensorExtModule is not available on the web platform.
class SensorExtModule extends NativeModule<Record<string, never>> {}

export default registerWebModule(SensorExtModule, 'SensorExtModule');
