// Re-export the native module. On web, it will be resolved to NetworkExtModule.web.ts
// and on native platforms to NetworkExtModule.ts
export { default } from './src/NetworkExtModule';
export * from './src/NetworkExt.types';
