import { registerWebModule, NativeModule } from 'expo';

// NetworkExtModule is not available on the web platform.
class NetworkExtModule extends NativeModule<Record<string, never>> {}

export default registerWebModule(NetworkExtModule, 'NetworkExtModule');
