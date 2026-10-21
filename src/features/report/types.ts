import type { ReportSection } from '@/core/utils/report-text';

export type ReportGroupId =
  | 'device'
  | 'system'
  | 'cpu'
  | 'gpu'
  | 'memory'
  | 'storage'
  | 'battery'
  | 'thermal'
  | 'display'
  | 'camera'
  | 'sensors'
  | 'network'
  | 'connectivity'
  | 'apps'
  | 'testResults';

/** One pickable block of the report; `build` reads the device only when asked. */
export type ReportGroup = {
  id: ReportGroupId;
  title: string;
  /** One-line explanation shown under the title in the picker. */
  description: string;
  /** Async only for the Apps summary, which asks the native module. */
  build: () => ReportSection[] | Promise<ReportSection[]>;
};
