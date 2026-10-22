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

export type DashboardTileAccent = 'primary' | 'accent' | 'violet' | 'good' | 'warning';

export type DashboardTileDefinition = {
  id: DashboardTileId;
  title: string;
  /** Short label used by the settings reorder list. */
  shortTitle: string;
  icon: IconName;
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

/**
 * Every visible tile is the same width and height. The grid is a fixed
 * two-column layout; when the count is odd the single leftover tile spans the
 * full width at the same height and lays its content out horizontally.
 */
export type DashboardTilePlacement = {
  id: DashboardTileId;
  width: 'full' | 'half';
};

/** Each inner array is one visual row of one or two tiles. */
export type DashboardTileRow = DashboardTilePlacement[];

export const DASHBOARD_TILE_DEFINITIONS: readonly DashboardTileDefinition[] = [
  {
    id: 'cpu',
    title: 'Processor',
    shortTitle: 'CPU',
    icon: 'cpu',
    accent: 'accent',
    route: '/cpu',
  },
  {
    id: 'memory',
    title: 'Memory',
    shortTitle: 'RAM',
    icon: 'memory',
    accent: 'violet',
    route: '/memory',
  },
  {
    id: 'storage',
    title: 'Storage',
    shortTitle: 'Storage',
    icon: 'storage',
    accent: 'primary',
    route: '/storage',
  },
  {
    id: 'battery',
    title: 'Battery',
    shortTitle: 'Battery',
    icon: 'battery',
    accent: 'good',
    route: '/battery',
  },
  {
    id: 'thermal',
    title: 'Thermal',
    shortTitle: 'Thermal',
    icon: 'thermometer',
    accent: 'warning',
    route: '/thermal',
  },
  {
    id: 'display',
    title: 'Display',
    shortTitle: 'Display',
    icon: 'display',
    accent: 'primary',
    route: '/display',
  },
  {
    id: 'network',
    title: 'Network',
    shortTitle: 'Network',
    icon: 'wifi',
    accent: 'accent',
    route: '/network',
  },
  {
    id: 'sensors',
    title: 'Sensors',
    shortTitle: 'Sensors',
    icon: 'sensors',
    accent: 'violet',
    route: '/sensors',
  },
  {
    id: 'camera',
    title: 'Camera',
    shortTitle: 'Camera',
    icon: 'camera',
    accent: 'primary',
    route: '/camera',
  },
  {
    id: 'connectivity',
    title: 'Connectivity',
    shortTitle: 'Connectivity',
    icon: 'bluetooth',
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

export type EqualTilePlacement<T> = {
  item: T;
  width: 'full' | 'half';
};

/**
 * The pure visible-items-to-rows rule used by the dashboard (and unit-tested
 * for 0–12 items): items pair up into two-column rows, and a single leftover
 * item becomes one full-width row. No other row shapes exist and no row is
 * ever left empty.
 */
export function layoutEqualTileRows<T>(items: readonly T[]): EqualTilePlacement<T>[][] {
  const rows: EqualTilePlacement<T>[][] = [];
  for (let index = 0; index < items.length; index += 2) {
    const first = items[index];
    if (first === undefined) break;
    const second = items[index + 1];
    if (second === undefined) {
      rows.push([{ item: first, width: 'full' }]);
    } else {
      rows.push([
        { item: first, width: 'half' },
        { item: second, width: 'half' },
      ]);
    }
  }
  return rows;
}

/** Builds the visual row order from the preferences. Hidden tiles are skipped. */
export function layoutDashboardTileRows(tiles: DashboardTilePreference[]): DashboardTileRow[] {
  const visible = tiles
    .filter((tile) => tile.visible && DEFINITION_BY_ID.has(tile.id))
    .map((tile) => tile.id);
  return layoutEqualTileRows(visible).map((row) =>
    row.map((placement) => ({ id: placement.item, width: placement.width })),
  );
}
