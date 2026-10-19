import { registerWebModule, NativeModule } from 'expo';

// ToolsExtModule is not available on the web platform.
class ToolsExtModule extends NativeModule<Record<string, never>> {}

export default registerWebModule(ToolsExtModule, 'ToolsExtModule');
