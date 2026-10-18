import { StyleSheet, View } from 'react-native';

import { Card, Skeleton } from '@/design-system/components';
import { spacing } from '@/design-system/tokens';

/** Shimmer placeholders for the gauge and the stats grid. */
export function BatterySkeleton() {
  return (
    <View style={styles.root}>
      <Card>
        <View style={styles.gauge}>
          <Skeleton width={240} height={104} />
          <Skeleton width={120} height={14} />
        </View>
      </Card>
      <Card>
        <View style={styles.grid}>
          {Array.from({ length: 6 }, (_, index) => (
            <View key={index} style={styles.cell}>
              <Skeleton width="55%" height={12} />
              <Skeleton width="75%" height={16} />
            </View>
          ))}
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.lg,
  },
  gauge: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: '50%',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
});
