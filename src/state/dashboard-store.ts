import { create } from 'zustand';

import { getString, setString } from '@/core/storage/mmkv';
import {
  defaultDashboardSectionPreferences,
  moveDashboardSection,
  parseDashboardSectionPreferences,
  serializeDashboardSectionPreferences,
  toggleDashboardSection,
  type DashboardSectionId,
  type DashboardSectionPreference,
} from '@/features/dashboard/services/dashboard-sections';
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

/** Two MMKV JSON documents, local only. */
export const DASHBOARD_LAYOUT_KEY = 'dashboard.tiles.v1';
export const DASHBOARD_SECTIONS_KEY = 'dashboard.sections.v1';

function readTiles(): DashboardTilePreference[] {
  return parseDashboardTilePreferences(getString(DASHBOARD_LAYOUT_KEY));
}

function readSections(): DashboardSectionPreference[] {
  return parseDashboardSectionPreferences(getString(DASHBOARD_SECTIONS_KEY));
}

function persistTiles(tiles: DashboardTilePreference[]): void {
  setString(DASHBOARD_LAYOUT_KEY, serializeDashboardTilePreferences(tiles));
}

function persistSections(sections: DashboardSectionPreference[]): void {
  setString(DASHBOARD_SECTIONS_KEY, serializeDashboardSectionPreferences(sections));
}

type DashboardLayoutState = {
  tiles: DashboardTilePreference[];
  sections: DashboardSectionPreference[];
  toggleTile: (id: DashboardTileId) => void;
  moveTile: (id: DashboardTileId, direction: DashboardMoveDirection) => void;
  resetTiles: () => void;
  toggleSection: (id: DashboardSectionId) => void;
  moveSection: (id: DashboardSectionId, direction: DashboardMoveDirection) => void;
  resetSections: () => void;
  resetLayout: () => void;
};

/** Home tile + slider order/visibility, read by both Home and Settings › Dashboard. */
export const useDashboardLayoutStore = create<DashboardLayoutState>((set) => ({
  tiles: readTiles(),
  sections: readSections(),
  toggleTile: (id) =>
    set((state) => {
      const tiles = toggleDashboardTile(state.tiles, id);
      persistTiles(tiles);
      return { tiles };
    }),
  moveTile: (id, direction) =>
    set((state) => {
      const tiles = moveDashboardTile(state.tiles, id, direction);
      if (tiles === state.tiles) return state;
      persistTiles(tiles);
      return { tiles };
    }),
  resetTiles: () => {
    const tiles = defaultDashboardTilePreferences();
    persistTiles(tiles);
    set({ tiles });
  },
  toggleSection: (id) =>
    set((state) => {
      const sections = toggleDashboardSection(state.sections, id);
      persistSections(sections);
      return { sections };
    }),
  moveSection: (id, direction) =>
    set((state) => {
      const sections = moveDashboardSection(state.sections, id, direction);
      if (sections === state.sections) return state;
      persistSections(sections);
      return { sections };
    }),
  resetSections: () => {
    const sections = defaultDashboardSectionPreferences();
    persistSections(sections);
    set({ sections });
  },
  resetLayout: () => {
    const tiles = defaultDashboardTilePreferences();
    const sections = defaultDashboardSectionPreferences();
    persistTiles(tiles);
    persistSections(sections);
    set({ tiles, sections });
  },
}));
