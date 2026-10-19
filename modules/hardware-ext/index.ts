// Re-export the native module. On web, it will be resolved to HardwareExtModule.web.ts
// and on native platforms to HardwareExtModule.ts
export { default } from './src/HardwareExtModule';
export * from './src/HardwareExt.types';
