import type { Href } from 'expo-router';

import type { IconName } from '@/design-system/icon';

export type SectionShortcut = {
  label: string;
  icon: IconName;
  route: Href;
};

export type SectionGroupDefinition = {
  id: string;
  title: string;
  shortcuts: readonly SectionShortcut[];
};

/**
 * Every destination in the app, grouped so Home can show them as horizontal
 * sliders. Each group appears exactly once. Settings itself is intentionally
 * absent: it is reached only from the gear in the top app bar.
 */
export const DASHBOARD_SECTION_GROUPS: readonly SectionGroupDefinition[] = [
  {
    id: 'system',
    title: 'System info',
    shortcuts: [
      { label: 'Device', icon: 'display', route: '/device' },
      { label: 'Processor', icon: 'cpu', route: '/cpu' },
      { label: 'Memory', icon: 'memory', route: '/memory' },
      { label: 'Storage', icon: 'storage', route: '/storage' },
      { label: 'Battery', icon: 'battery', route: '/battery' },
      { label: 'Thermal', icon: 'thermometer', route: '/thermal' },
      { label: 'Display', icon: 'display', route: '/display' },
      { label: 'Camera', icon: 'camera', route: '/camera' },
      { label: 'Sensors', icon: 'sensors', route: '/sensors' },
      { label: 'Connectivity', icon: 'bluetooth', route: '/connectivity' },
    ],
  },
  {
    id: 'network',
    title: 'Network',
    shortcuts: [
      { label: 'Network', icon: 'wifi', route: '/network' },
      { label: 'Wi-Fi analyzer', icon: 'signal', route: '/wifi-analyzer' },
      { label: 'Data usage', icon: 'gauge', route: '/data-usage' },
    ],
  },
  {
    id: 'apps',
    title: 'Apps and usage',
    shortcuts: [
      { label: 'Apps', icon: 'apps', route: '/apps' },
      { label: 'App analyzer', icon: 'search', route: '/app-analyzer' },
      { label: 'Permissions', icon: 'fingerprint', route: '/permission-analyzer' },
      { label: 'Screen time', icon: 'clock', route: '/screen-time' },
    ],
  },
  {
    id: 'tests',
    title: 'Tests and tools',
    shortcuts: [
      { label: 'Hardware tests', icon: 'wrench', route: '/hardware-tests' },
      { label: 'Touch test', icon: 'pointer', route: '/touch-test' },
      { label: 'Screen test', icon: 'sun', route: '/screen-test' },
      { label: 'Alarm', icon: 'alarm', route: '/alarm' },
      { label: 'Timer', icon: 'timer', route: '/timer' },
      { label: 'Tools', icon: 'tools', route: '/tools' },
    ],
  },
  {
    id: 'more',
    title: 'More',
    shortcuts: [
      { label: 'Tips', icon: 'tips', route: '/tips' },
      { label: 'Export info', icon: 'report', route: '/report' },
      { label: 'Widgets', icon: 'apps', route: '/widgets' },
    ],
  },
];

export type DashboardSectionId = string;

export type DashboardSectionPreference = {
  id: DashboardSectionId;
  visible: boolean;
};

const DEFINITION_BY_ID = new Map(
  DASHBOARD_SECTION_GROUPS.map((group) => [group.id, group] as const),
);
const IDS = new Set<string>(DASHBOARD_SECTION_GROUPS.map((group) => group.id));

export function getDashboardSectionDefinition(
  id: DashboardSectionId,
): SectionGroupDefinition | undefined {
  return DEFINITION_BY_ID.get(id);
}

export function defaultDashboardSectionPreferences(): DashboardSectionPreference[] {
  return DASHBOARD_SECTION_GROUPS.map((group) => ({ id: group.id, visible: true }));
}

type StoredSections = {
  version: 1;
  sections: { id: string; visible: boolean }[];
};

function isSectionId(value: unknown): value is DashboardSectionId {
  return typeof value === 'string' && IDS.has(value);
}

/** Reads stored slider order/visibility without trusting the document. */
export function parseDashboardSectionPreferences(
  raw: string | null | undefined,
): DashboardSectionPreference[] {
  if (raw == null || raw.length === 0) return defaultDashboardSectionPreferences();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return defaultDashboardSectionPreferences();
  }
  const items = Array.isArray(parsed)
    ? parsed
    : parsed != null &&
        typeof parsed === 'object' &&
        Array.isArray((parsed as StoredSections).sections)
      ? (parsed as StoredSections).sections
      : null;
  if (items == null) return defaultDashboardSectionPreferences();

  const seen = new Set<DashboardSectionId>();
  const result: DashboardSectionPreference[] = [];
  for (const item of items) {
    if (item == null || typeof item !== 'object') continue;
    const candidate = item as { id?: unknown; visible?: unknown };
    if (!isSectionId(candidate.id) || seen.has(candidate.id)) continue;
    seen.add(candidate.id);
    result.push({ id: candidate.id, visible: candidate.visible !== false });
  }
  for (const group of DASHBOARD_SECTION_GROUPS) {
    if (!seen.has(group.id)) result.push({ id: group.id, visible: true });
  }
  return result;
}

export function serializeDashboardSectionPreferences(
  sections: DashboardSectionPreference[],
): string {
  const document: StoredSections = {
    version: 1,
    sections: sections.map((section) => ({ id: section.id, visible: section.visible })),
  };
  return JSON.stringify(document);
}

export function toggleDashboardSection(
  sections: DashboardSectionPreference[],
  id: DashboardSectionId,
): DashboardSectionPreference[] {
  return sections.map((section) =>
    section.id === id ? { ...section, visible: !section.visible } : section,
  );
}

export function moveDashboardSection(
  sections: DashboardSectionPreference[],
  id: DashboardSectionId,
  direction: 'up' | 'down',
): DashboardSectionPreference[] {
  const index = sections.findIndex((section) => section.id === id);
  if (index < 0) return sections;
  const nextIndex = direction === 'up' ? index - 1 : index + 1;
  if (nextIndex < 0 || nextIndex >= sections.length) return sections;
  const next = [...sections];
  const current = next[index];
  const other = next[nextIndex];
  if (current == null || other == null) return sections;
  next[index] = other;
  next[nextIndex] = current;
  return next;
}

/** Visible groups in the user's saved order. */
export function visibleDashboardSections(
  sections: DashboardSectionPreference[],
): SectionGroupDefinition[] {
  return sections
    .filter((section) => section.visible)
    .map((section) => DEFINITION_BY_ID.get(section.id))
    .filter((group): group is SectionGroupDefinition => group != null);
}
