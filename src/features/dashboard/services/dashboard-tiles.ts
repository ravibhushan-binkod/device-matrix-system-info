import type { IconName } from '@/design-system/icon';

export type DashboardTileId =
  | 'cpu'
  | 'memory'
  | 'storage'
  | 'battery'
  | 'thermal'
  | 'display'
  | 'network'
  | 'sensors'
  | 'camera'
  | 'connectivity';

export type DashboardTileSize = 's' | 'm' | 'l';

export type DashboardTileAccent = 'primary' | 'accent' | 'violet' | 'good' | 'warning';

export type DashboardTileDefinition = {
  id: DashboardTileId;
  title: string;
  /** Short label used by the settings reorder list. */
  shortTitle: string;
  icon: IconName;
  /** Default grid size; the registry is the single source for the layout. */
  size: DashboardTileSize;
  accent: DashboardTileAccent;
  /** The detail screen this tile opens. */
  route:
    | '/cpu'
    | '/memory'
    | '/storage'
    | '/battery'
    | '/thermal'
    | '/display'
    | '/network'
    | '/sensors'
    | '/camera'
    | '/connectivity';
};

export type DashboardTilePreference = {
  id: DashboardTileId;
  visible: boolean;
};

export type DashboardTilePlacement = {
  id: DashboardTileId;
  size: DashboardTileSize;
  width: 'full' | 'half';
};

/** Each inner array is one visual row. Full-size tiles always get their own row. */
export type DashboardTileRow = DashboardTilePlacement[];

export const DASHBOARD_TILE_DEFINITIONS: readonly DashboardTileDefinition[] = [
  {
    id: 'cpu',
    title: 'Processor',
    shortTitle: 'CPU',
    icon: 'cpu',
    size: 'l',
    accent: 'accent',
    route: '/cpu',
  },
  {
    id: 'memory',
    title: 'Memory',
    shortTitle: 'RAM',
    icon: 'memory',
    size: 'm',
    accent: 'violet',
    route: '/memory',
  },
  {
    id: 'storage',
    title: 'Storage',
    shortTitle: 'Storage',
    icon: 'storage',
    size: 'm',
    accent: 'primary',
    route: '/storage',
  },
  {
    id: 'battery',
    title: 'Battery',
    shortTitle: 'Battery',
    icon: 'battery',
    size: 'm',
    accent: 'good',
    route: '/battery',
  },
  {
    id: 'thermal',
    title: 'Thermal',
    shortTitle: 'Thermal',
    icon: 'thermometer',
    size: 's',
    accent: 'warning',
    route: '/thermal',
  },
  {
    id: 'display',
    title: 'Display',
    shortTitle: 'Display',
    icon: 'display',
    size: 's',
    accent: 'primary',
    route: '/display',
  },
  {
    id: 'network',
    title: 'Network',
    shortTitle: 'Network',
    icon: 'wifi',
    size: 'm',
    accent: 'accent',
    route: '/network',
  },
  {
    id: 'sensors',
    title: 'Sensors',
    shortTitle: 'Sensors',
    icon: 'sensors',
    size: 'm',
    accent: 'violet',
    route: '/sensors',
  },
  {
    id: 'camera',
    title: 'Camera',
    shortTitle: 'Camera',
    icon: 'camera',
    size: 's',
    accent: 'primary',
    route: '/camera',
  },
  {
    id: 'connectivity',
    title: 'Connectivity',
    shortTitle: 'Connectivity',
    icon: 'bluetooth',
    size: 'l',
    accent: 'accent',
    route: '/connectivity',
  },
];

const DEFINITION_BY_ID = new Map(DASHBOARD_TILE_DEFINITIONS.map((tile) => [tile.id, tile]));
const IDS = new Set<string>(DASHBOARD_TILE_DEFINITIONS.map((tile) => tile.id));

export function isDashboardTileId(value: unknown): value is DashboardTileId {
  return typeof value === 'string' && IDS.has(value);
}

export function getDashboardTileDefinition(id: DashboardTileId): DashboardTileDefinition {
  return DEFINITION_BY_ID.get(id) as DashboardTileDefinition;
}

export function defaultDashboardTilePreferences(): DashboardTilePreference[] {
  return DASHBOARD_TILE_DEFINITIONS.map((tile) => ({ id: tile.id, visible: true }));
}

type StoredLayout = {
  version: 1;
  tiles: { id: string; visible: boolean }[];
};

/**
 * Reads a stored layout without trusting it. Unknown ids are dropped, missing
 * tiles are appended visible and duplicates keep their first position, so a
 * renamed or removed tile can never make Home empty or crash it.
 */
export function parseDashboardTilePreferences(
  raw: string | null | undefined,
): DashboardTilePreference[] {
  if (raw == null || raw.length === 0) return defaultDashboardTilePreferences();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return defaultDashboardTilePreferences();
  }
  const items = Array.isArray(parsed)
    ? parsed
    : parsed != null && typeof parsed === 'object' && Array.isArray((parsed as StoredLayout).tiles)
      ? (parsed as StoredLayout).tiles
      : null;
  if (items == null) return defaultDashboardTilePreferences();

  const seen = new Set<DashboardTileId>();
  const result: DashboardTilePreference[] = [];
  for (const item of items) {
    if (item == null || typeof item !== 'object') continue;
    const candidate = item as { id?: unknown; visible?: unknown };
    if (!isDashboardTileId(candidate.id) || seen.has(candidate.id)) continue;
    seen.add(candidate.id);
    result.push({
      id: candidate.id,
      visible: candidate.visible !== false,
    });
  }
  for (const tile of DASHBOARD_TILE_DEFINITIONS) {
    if (!seen.has(tile.id)) result.push({ id: tile.id, visible: true });
  }
  return result;
}

export function serializeDashboardTilePreferences(tiles: DashboardTilePreference[]): string {
  const document: StoredLayout = {
    version: 1,
    tiles: tiles.map((tile) => ({ id: tile.id, visible: tile.visible })),
  };
  return JSON.stringify(document);
}

export function toggleDashboardTile(
  tiles: DashboardTilePreference[],
  id: DashboardTileId,
): DashboardTilePreference[] {
  return tiles.map((tile) => (tile.id === id ? { ...tile, visible: !tile.visible } : tile));
}

export type DashboardMoveDirection = 'up' | 'down';

/** Moves one tile within the full preference list, including hidden entries. */
export function moveDashboardTile(
  tiles: DashboardTilePreference[],
  id: DashboardTileId,
  direction: DashboardMoveDirection,
): DashboardTilePreference[] {
  const index = tiles.findIndex((tile) => tile.id === id);
  if (index < 0) return tiles;
  const nextIndex = direction === 'up' ? index - 1 : index + 1;
  if (nextIndex < 0 || nextIndex >= tiles.length) return tiles;
  const next = [...tiles];
  const current = next[index];
  const other = next[nextIndex];
  if (current == null || other == null) return tiles;
  next[index] = other;
  next[nextIndex] = current;
  return next;
}

/** Builds the visual row order from the preferences. Hidden tiles are skipped. */
export function layoutDashboardTileRows(tiles: DashboardTilePreference[]): DashboardTileRow[] {
  const rows: DashboardTileRow[] = [];
  let halfRow: DashboardTilePlacement[] = [];

  const flushHalf = () => {
    if (halfRow.length > 0) {
      rows.push(halfRow);
      halfRow = [];
    }
  };

  for (const preference of tiles) {
    if (!preference.visible) continue;
    const definition = DEFINITION_BY_ID.get(preference.id);
    if (!definition) continue;
    if (definition.size === 'l') {
      flushHalf();
      rows.push([{ id: definition.id, size: definition.size, width: 'full' }]);
      continue;
    }
    halfRow.push({ id: definition.id, size: definition.size, width: 'half' });
    if (halfRow.length === 2) flushHalf();
  }
  flushHalf();
  return rows;
}
