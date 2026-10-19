// Re-export the native module. On web, it will be resolved to AppsExtModule.web.ts
// and on native platforms to AppsExtModule.ts
export { default } from './src/AppsExtModule';
export * from './src/AppsExt.types';
