import { registerWebModule, NativeModule } from 'expo';

// HardwareExtModule is not available on the web platform.
class HardwareExtModule extends NativeModule<Record<string, never>> {}

export default registerWebModule(HardwareExtModule, 'HardwareExtModule');
