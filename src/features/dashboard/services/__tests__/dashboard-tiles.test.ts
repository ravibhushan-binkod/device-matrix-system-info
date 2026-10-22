import {
  DASHBOARD_TILE_DEFINITIONS,
  defaultDashboardTilePreferences,
  isDashboardTileId,
  layoutDashboardTileRows,
  moveDashboardTile,
  parseDashboardTilePreferences,
  serializeDashboardTilePreferences,
  toggleDashboardTile,
} from '@/features/dashboard/services/dashboard-tiles';

describe('dashboard tile definitions', () => {
  it('is the single registry for every tile', () => {
    expect(DASHBOARD_TILE_DEFINITIONS).toHaveLength(10);
    expect(new Set(DASHBOARD_TILE_DEFINITIONS.map((tile) => tile.id)).size).toBe(10);
    expect(isDashboardTileId('cpu')).toBe(true);
    expect(isDashboardTileId('unknown')).toBe(false);
  });
});

describe('parseDashboardTilePreferences', () => {
  it('defaults when nothing is stored or JSON is broken', () => {
    expect(parseDashboardTilePreferences(null)).toEqual(defaultDashboardTilePreferences());
    expect(parseDashboardTilePreferences('{oops')).toEqual(defaultDashboardTilePreferences());
    const allVisible = defaultDashboardTilePreferences().every((tile) => tile.visible);
    expect(allVisible).toBe(true);
  });

  it('keeps valid order and visibility', () => {
    const parsed = parseDashboardTilePreferences(
      JSON.stringify({
        version: 1,
        tiles: [
          { id: 'battery', visible: false },
          { id: 'cpu', visible: true },
        ],
      }),
    );
    expect(parsed[0]).toEqual({ id: 'battery', visible: false });
    expect(parsed[1]).toEqual({ id: 'cpu', visible: true });
    expect(parsed).toHaveLength(10);
  });

  it('drops unknown ids, duplicates and appends missing tiles visible', () => {
    const parsed = parseDashboardTilePreferences(
      JSON.stringify([
        { id: 'network', visible: false },
        { id: 'network', visible: true },
        { id: 'bogus', visible: true },
      ]),
    );
    expect(parsed[0]).toEqual({ id: 'network', visible: false });
    expect(parsed.filter((tile) => tile.id === 'network')).toHaveLength(1);
    expect(parsed).toHaveLength(10);
    expect(parsed.find((tile) => tile.id === 'cpu')).toEqual({ id: 'cpu', visible: true });
  });

  it('round-trips through the stored document', () => {
    const original = defaultDashboardTilePreferences().reverse();
    expect(parseDashboardTilePreferences(serializeDashboardTilePreferences(original))).toEqual(
      original,
    );
  });
});

describe('tile preference mutations', () => {
  it('toggles only the requested tile', () => {
    const next = toggleDashboardTile(defaultDashboardTilePreferences(), 'cpu');
    expect(next.find((tile) => tile.id === 'cpu')?.visible).toBe(false);
    expect(next.filter((tile) => !tile.visible)).toHaveLength(1);
  });

  it('moves a tile and keeps the list stable at the edges', () => {
    const initial = defaultDashboardTilePreferences();
    const moved = moveDashboardTile(initial, 'cpu', 'down');
    expect(moved[0]?.id).toBe('memory');
    expect(moved[1]?.id).toBe('cpu');
    expect(moveDashboardTile(initial, 'cpu', 'up')).toBe(initial);
    expect(moveDashboardTile(initial, 'connectivity', 'down')).toBe(initial);
    expect(moveDashboardTile(initial, 'missing' as never, 'up')).toBe(initial);
  });
});

describe('layoutDashboardTileRows', () => {
  it('gives full tiles their own row and pairs half tiles', () => {
    const rows = layoutDashboardTileRows(defaultDashboardTilePreferences());
    expect(rows.map((row) => row.map((tile) => tile.id))).toEqual([
      ['cpu'],
      ['memory', 'storage'],
      ['battery', 'thermal'],
      ['display', 'network'],
      ['sensors', 'camera'],
      ['connectivity'],
    ]);
  });

  it('never leaves an empty row when tiles are hidden', () => {
    const hidden = defaultDashboardTilePreferences().map((tile) =>
      tile.id === 'cpu' || tile.id === 'connectivity' ? { ...tile, visible: false } : tile,
    );
    const rows = layoutDashboardTileRows(hidden);
    expect(rows.every((row) => row.length > 0)).toBe(true);
    expect(rows.flat().map((tile) => tile.id)).not.toContain('cpu');
  });

  it('fills rows in the stored order', () => {
    const reordered = moveDashboardTile(defaultDashboardTilePreferences(), 'connectivity', 'up');
    const rows = layoutDashboardTileRows(reordered);
    const connectivityRow = rows.find((row) => row.some((tile) => tile.id === 'connectivity'));
    expect(connectivityRow).toHaveLength(1);
    expect(connectivityRow?.[0]?.id).toBe('connectivity');
    expect(rows[0]?.[0]?.id).toBe('cpu');
  });
});
