import type { ReportSection } from '@/core/utils/report-text';

export type ReportGroupId =
  | 'device'
  | 'battery'
  | 'memory'
  | 'storage'
  | 'display'
  | 'cpu'
  | 'network'
  | 'thermal'
  | 'sensors'
  | 'hardwareTests';

/** One pickable block of the report; `build` reads the device only when asked. */
export type ReportGroup = {
  id: ReportGroupId;
  title: string;
  build: () => ReportSection[];
};
