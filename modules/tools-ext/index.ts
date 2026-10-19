// Re-export the native module. On web, it will be resolved to ToolsExtModule.web.ts
// and on native platforms to ToolsExtModule.ts
export { default } from './src/ToolsExtModule';
export * from './src/ToolsExt.types';
