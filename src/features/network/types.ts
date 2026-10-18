/**
 * Types for the network feature. Readings use the shared `Result<T>` model
 * from `@/core/result`.
 */

/** The two permission-gated reads on the network screen. */
export type NetworkPermissionKind = 'wifi-name' | 'bluetooth';
