import { StyleSheet, View } from 'react-native';

import { Card, Skeleton } from '@/design-system/components';
import { spacing } from '@/design-system/tokens';

/** Shimmer placeholders for the summary card and the rings row. */
export function HomeSkeleton() {
  return (
    <View style={styles.root}>
      <Card>
        <View style={styles.stack}>
          <Skeleton width="62%" height={20} />
          <Skeleton width="45%" height={14} />
          <Skeleton width="52%" height={14} />
        </View>
      </Card>
      <Card>
        <View style={styles.rings}>
          <Skeleton width={88} height={88} round />
          <Skeleton width={88} height={88} round />
          <Skeleton width={88} height={88} round />
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.lg,
  },
  stack: {
    gap: spacing.sm,
  },
  rings: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
