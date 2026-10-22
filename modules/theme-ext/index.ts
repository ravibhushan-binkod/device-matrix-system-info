// Re-export the native module. On web, it will be resolved to ThemeExtModule.web.ts
// and on native platforms to ThemeExtModule.ts
export { default } from './src/ThemeExtModule';
export * from './src/ThemeExt.types';
