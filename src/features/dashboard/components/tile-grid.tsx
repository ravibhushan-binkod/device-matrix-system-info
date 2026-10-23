import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useFormatters } from '@/core/units/use-formatters';
import { TileTransition } from '@/design-system/animations/tile-transition';
import { AdSlot } from '@/design-system/components';
import { spacing } from '@/design-system/tokens';
import { TileCard } from '@/features/dashboard/components/tile-card';
import { TileContent, tileCopySummary } from '@/features/dashboard/components/tile-content';
import {
  getDashboardTileDefinition,
  layoutDashboardTileRows,
  type DashboardTilePreference,
} from '@/features/dashboard/services/dashboard-tiles';
import { useSettingsStore } from '@/state/settings-store';
import type { DashboardInventory, DashboardSummary } from '@/features/dashboard/types';

type Props = {
  tiles: DashboardTilePreference[];
  summary: DashboardSummary;
  inventory: DashboardInventory | null;
  cpuHistory: number[];
  memoryHistory: number[];
};

/**
 * The equal-tile dashboard grid: every tile is the same width and height, two
 * per row, and the single leftover tile spans the full width without changing
 * its height. The first ad follows the first row, never inside the first
 * viewport.
 */
export function TileGrid({ tiles, summary, inventory, cpuHistory, memoryHistory }: Props) {
  const router = useRouter();
  const { units } = useFormatters();
  const hideSensitiveValues = useSettingsStore((state) => state.hideSensitiveValues);
  const rows = layoutDashboardTileRows(tiles);
  const adRow = Math.min(1, rows.length - 1);

  return (
    <View style={styles.rows}>
      {rows.map((row, rowIndex) => (
        <Fragment key={row.map((item) => item.id).join('-')}>
          <View style={styles.row}>
            {row.map((placement, index) => {
              const definition = getDashboardTileDefinition(placement.id);
              const wide = placement.width === 'full';
              return (
                <View key={placement.id} style={wide ? styles.full : styles.half}>
                  <TileTransition index={rowIndex * 2 + index}>
                    <TileCard
                      id={placement.id}
                      onPress={() => router.push(definition.route)}
                      accessibilityLabel={`${definition.title}. Opens the ${definition.title} section.${
                        wide ? ' Full-width tile.' : ''
                      }`}
                      copyText={tileCopySummary(placement.id, summary, inventory, {
                        includeSensitive: !hideSensitiveValues,
                        units,
                      })}
                    >
                      <TileContent
                        id={placement.id}
                        definition={definition}
                        summary={summary}
                        inventory={inventory}
                        cpuHistory={cpuHistory}
                        memoryHistory={memoryHistory}
                        wide={wide}
                      />
                    </TileCard>
                  </TileTransition>
                </View>
              );
            })}
          </View>
          {rowIndex === adRow ? <AdSlot placement="home-dashboard" style={styles.ad} /> : null}
        </Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  rows: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.md,
  },
  half: {
    flex: 1,
  },
  full: {
    width: '100%',
  },
  ad: {
    marginVertical: spacing.sm,
  },
});
