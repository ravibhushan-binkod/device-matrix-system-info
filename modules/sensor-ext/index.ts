// Re-export the native module. On web, it will be resolved to SensorExtModule.web.ts
// and on native platforms to SensorExtModule.ts
export { default } from './src/SensorExtModule';
export * from './src/SensorExt.types';
