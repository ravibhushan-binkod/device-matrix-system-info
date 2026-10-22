import { create } from 'zustand';

import { getString, setString } from '@/core/storage/mmkv';
import {
  defaultDashboardTilePreferences,
  moveDashboardTile,
  parseDashboardTilePreferences,
  serializeDashboardTilePreferences,
  toggleDashboardTile,
  type DashboardMoveDirection,
  type DashboardTileId,
  type DashboardTilePreference,
} from '@/features/dashboard/services/dashboard-tiles';

/** One MMKV JSON document, local only. */
export const DASHBOARD_LAYOUT_KEY = 'dashboard.tiles.v1';

function readTiles(): DashboardTilePreference[] {
  return parseDashboardTilePreferences(getString(DASHBOARD_LAYOUT_KEY));
}

function persist(tiles: DashboardTilePreference[]): void {
  setString(DASHBOARD_LAYOUT_KEY, serializeDashboardTilePreferences(tiles));
}

type DashboardLayoutState = {
  tiles: DashboardTilePreference[];
  toggleTile: (id: DashboardTileId) => void;
  moveTile: (id: DashboardTileId, direction: DashboardMoveDirection) => void;
  resetTiles: () => void;
};

/** Home tile order/visibility, read by both Home and Settings › Dashboard. */
export const useDashboardLayoutStore = create<DashboardLayoutState>((set) => ({
  tiles: readTiles(),
  toggleTile: (id) =>
    set((state) => {
      const tiles = toggleDashboardTile(state.tiles, id);
      persist(tiles);
      return { tiles };
    }),
  moveTile: (id, direction) =>
    set((state) => {
      const tiles = moveDashboardTile(state.tiles, id, direction);
      if (tiles === state.tiles) return state;
      persist(tiles);
      return { tiles };
    }),
  resetTiles: () => {
    const tiles = defaultDashboardTilePreferences();
    persist(tiles);
    set({ tiles });
  },
}));
