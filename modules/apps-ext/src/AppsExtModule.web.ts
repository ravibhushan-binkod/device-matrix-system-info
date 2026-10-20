import { registerWebModule, NativeModule } from 'expo';

// AppsExtModule is not available on the web platform.
class AppsExtModule extends NativeModule<Record<string, never>> {}

export default registerWebModule(AppsExtModule, 'AppsExtModule');
