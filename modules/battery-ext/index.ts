// Re-export the native module. On web, it will be resolved to BatteryExtModule.web.ts
// and on native platforms to BatteryExtModule.ts
export { default } from './src/BatteryExtModule';
export * from './src/BatteryExt.types';
