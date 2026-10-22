import { StyleSheet, View } from 'react-native';

import { Shimmer } from '@/design-system/animations/shimmer';
import { spacing } from '@/design-system/tokens';

/** Shimmer placeholders for the hero and the first tile rows. */
export function HomeSkeleton() {
  return (
    <View style={styles.root}>
      <Shimmer height={340} />
      <View style={styles.rows}>
        <Shimmer width="38%" height={14} />
        <Shimmer height={220} />
        <View style={styles.pair}>
          <Shimmer width="48%" height={190} />
          <Shimmer width="48%" height={190} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.xl,
  },
  rows: {
    gap: spacing.md,
  },
  pair: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
