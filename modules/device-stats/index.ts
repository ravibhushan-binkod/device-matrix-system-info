// Re-export the native module. On web, it will be resolved to DeviceStatsModule.web.ts
// and on native platforms to DeviceStatsModule.ts
export { default } from './src/DeviceStatsModule';
export * from './src/DeviceStats.types';
