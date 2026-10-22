import {
  DASHBOARD_TILE_DEFINITIONS,
  defaultDashboardTilePreferences,
  isDashboardTileId,
  layoutDashboardTileRows,
  layoutEqualTileRows,
  moveDashboardTile,
  parseDashboardTilePreferences,
  serializeDashboardTilePreferences,
  toggleDashboardTile,
  type DashboardTilePreference,
} from '@/features/dashboard/services/dashboard-tiles';

describe('dashboard tile definitions', () => {
  it('is the single registry for every tile', () => {
    expect(DASHBOARD_TILE_DEFINITIONS).toHaveLength(10);
    expect(new Set(DASHBOARD_TILE_DEFINITIONS.map((tile) => tile.id)).size).toBe(10);
    expect(isDashboardTileId('cpu')).toBe(true);
    expect(isDashboardTileId('unknown')).toBe(false);
  });

  it('has no per-tile size anymore — every tile is equal', () => {
    for (const tile of DASHBOARD_TILE_DEFINITIONS) {
      expect('size' in tile).toBe(false);
    }
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

describe('layoutEqualTileRows', () => {
  it('handles every count from 0 to 12 without gaps', () => {
    for (let count = 0; count <= 12; count += 1) {
      const items = Array.from({ length: count }, (_, index) => index);
      const rows = layoutEqualTileRows(items);
      expect(rows.flat().map((placement) => placement.item)).toEqual(items);
      expect(rows.every((row) => row.length === 1 || row.length === 2)).toBe(true);
      for (const [index, row] of rows.entries()) {
        if (row.length === 2) {
          expect(row.map((placement) => placement.width)).toEqual(['half', 'half']);
        } else {
          expect(row[0]?.width).toBe('full');
          // Only the final row may be a single full-width tile.
          expect(index).toBe(rows.length - 1);
        }
      }
    }
  });

  it('pairs items in order', () => {
    expect(layoutEqualTileRows(['a', 'b', 'c']).map((row) => row.map((p) => p.item))).toEqual([
      ['a', 'b'],
      ['c'],
    ]);
  });
});

describe('layoutDashboardTileRows', () => {
  it('pairs the default set with no full-width row', () => {
    const rows = layoutDashboardTileRows(defaultDashboardTilePreferences());
    expect(rows.map((row) => row.map((tile) => tile.id))).toEqual([
      ['cpu', 'memory'],
      ['storage', 'battery'],
      ['thermal', 'display'],
      ['network', 'sensors'],
      ['camera', 'connectivity'],
    ]);
    expect(rows.flat().every((placement) => placement.width === 'half')).toBe(true);
  });

  it('refills rows after any hide combination with no gaps', () => {
    const defaults = defaultDashboardTilePreferences();
    const total = 1 << defaults.length;

    for (let mask = 0; mask < total; mask += 1) {
      const hidden = new Set(
        defaults.filter((_, index) => (mask & (1 << index)) !== 0).map((tile) => tile.id),
      );
      const tiles: DashboardTilePreference[] = defaults.map((tile) => ({
        ...tile,
        visible: !hidden.has(tile.id),
      }));
      const expected = tiles.filter((tile) => tile.visible).map((tile) => tile.id);
      const rows = layoutDashboardTileRows(tiles);

      expect(rows.flat().map((placement) => placement.id)).toEqual(expected);
      expect(rows.every((row) => row.length > 0)).toBe(true);
      for (const [index, row] of rows.entries()) {
        if (row.length === 2) {
          expect(row[0]?.width).toBe('half');
          expect(row[1]?.width).toBe('half');
        } else {
          expect(row[0]?.width).toBe('full');
          expect(index).toBe(rows.length - 1);
        }
      }
    }
  });

  it('moves a full-width leftover when the order changes', () => {
    // Hide one tile so the visible count is odd and a leftover exists.
    const withSensorsHidden = toggleDashboardTile(defaultDashboardTilePreferences(), 'sensors');
    const reordered = moveDashboardTile(withSensorsHidden, 'connectivity', 'up');
    const rows = layoutDashboardTileRows(reordered);
    // connectivity and camera swap; camera becomes the last, full-width tile.
    expect(rows[rows.length - 1]).toEqual([{ id: 'camera', width: 'full' }]);
    const connectivityRow = rows.find((row) => row.some((tile) => tile.id === 'connectivity'));
    expect(connectivityRow?.map((tile) => tile.id)).toEqual(['network', 'connectivity']);
    expect(rows.flat().map((placement) => placement.id)).toEqual(
      reordered.filter((tile) => tile.visible).map((tile) => tile.id),
    );
  });
});
