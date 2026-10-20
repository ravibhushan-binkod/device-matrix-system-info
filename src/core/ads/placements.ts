/**
 * Banner placement ids — one per slot in the app.
 *
 * Placement rules (see docs/RELEASE.md): banners sit between information
 * sections only, never on splash, permission sheets, settings, full-screen
 * tests or live graphs, at most two per screen and at least one screen-height
 * apart, with clear space around buttons. The id is used for dev logging and
 * to keep the placements reviewable; every placement currently shares the one
 * banner ad unit.
 */
export type BannerPlacement =
  | 'home-end'
  | 'hub-grid'
  | 'device-sections'
  | 'cpu-mid'
  | 'memory-mid'
  | 'storage-top'
  | 'battery-mid'
  | 'thermal-mid'
  | 'display-mid'
  | 'camera-lens'
  | 'sensors-list'
  | 'network-connection'
  | 'network-end'
  | 'apps-header'
  | 'apps-list'
  | 'gallery';
