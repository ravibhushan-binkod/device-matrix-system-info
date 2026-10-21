import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

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
import type { DashboardInventory, DashboardSummary } from '@/features/dashboard/types';

type Props = {
  tiles: DashboardTilePreference[];
  summary: DashboardSummary;
  inventory: DashboardInventory | null;
  cpuHistory: number[];
  memoryHistory: number[];
};

/**
 * The two-column registry grid. Full-width tiles always get their own row;
 * the first ad follows the first two rows, never inside the first viewport.
 */
export function TileGrid({ tiles, summary, inventory, cpuHistory, memoryHistory }: Props) {
  const router = useRouter();
  const rows = layoutDashboardTileRows(tiles);
  const adRow = Math.min(1, rows.length - 1);

  return (
    <View style={styles.rows}>
      {rows.map((row, rowIndex) => (
        <Fragment key={row.map((item) => item.id).join('-')}>
          <View style={styles.row}>
            {row.map((placement, index) => {
              const definition = getDashboardTileDefinition(placement.id);
              return (
                <View
                  key={placement.id}
                  style={placement.width === 'full' ? styles.full : styles.half}
                >
                  <TileTransition index={rowIndex * 2 + index}>
                    <TileCard
                      id={placement.id}
                      size={placement.size}
                      onPress={() => router.push(definition.route)}
                      accessibilityLabel={`${definition.title}. Opens the ${definition.title} section.`}
                      copyText={tileCopySummary(placement.id, summary, inventory)}
                    >
                      <TileContent
                        id={placement.id}
                        size={placement.size}
                        definition={definition}
                        summary={summary}
                        inventory={inventory}
                        cpuHistory={cpuHistory}
                        memoryHistory={memoryHistory}
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
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  half: {
    width: '48%',
  },
  full: {
    width: '100%',
  },
  ad: {
    marginVertical: spacing.sm,
  },
});
