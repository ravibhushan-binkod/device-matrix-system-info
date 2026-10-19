import { useRouter, type Href } from 'expo-router';
import { Fragment } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';

import { AdSlot, Card, Screen, Skeleton } from '@/design-system/components';
import { Icon, type IconName } from '@/design-system/icon';
import { useTheme } from '@/design-system/theme';
import { spacing, typography } from '@/design-system/tokens';
import { useHardware } from '@/features/hardware/hooks/use-hardware';
import { buildHubEntries } from '@/features/hardware/services/hardware-service';
import type { HubEntry, HubKey } from '@/features/hardware/types';

const ICONS: Record<HubKey, IconName> = {
  device: 'info',
  cpu: 'cpu',
  thermal: 'thermometer',
  memory: 'memory',
  storage: 'storage',
  battery: 'battery',
  display: 'display',
  camera: 'camera',
  sensors: 'sensors',
};

const ROUTES: Record<HubKey, Href> = {
  device: '/device',
  cpu: '/cpu',
  thermal: '/thermal',
  memory: '/memory',
  storage: '/storage',
  battery: '/battery',
  display: '/display',
  camera: '/camera',
  sensors: '/sensors',
};

/** Hardware hub: one card per area, each showing a live value. */
export function HardwareHub() {
  const router = useRouter();
  const { colors } = useTheme();
  const { summary, refreshing, refresh } = useHardware();
  const entries = summary ? buildHubEntries(summary) : null;

  return (
    <Screen
      scroll
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
          colors={[colors.accent]}
          progressBackgroundColor={colors.surface2}
          tintColor={colors.accent}
        />
      }
      contentStyle={styles.content}
    >
      {entries ? (
        <View style={styles.grid}>
          {entries.map((entry, index) => (
            <Fragment key={entry.key}>
              <HubCard entry={entry} onPress={() => router.push(ROUTES[entry.key])} />
              {index === 5 ? <AdSlot placement="hub-grid" style={styles.gridAd} /> : null}
            </Fragment>
          ))}
        </View>
      ) : (
        <View style={styles.grid}>
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} width="48%" height={104} style={styles.skeletonCard} />
          ))}
        </View>
      )}
    </Screen>
  );
}

function HubCard({ entry, onPress }: { entry: HubEntry; onPress: () => void }) {
  const { colors } = useTheme();

  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.cardHead}>
        <Icon name={ICONS[entry.key]} size={20} color={colors.accent} />
        <Text numberOfLines={1} style={[styles.cardTitle, { color: colors.muted }]}>
          {entry.title}
        </Text>
        <Icon name="chevron-right" size={16} color={colors.muted} />
      </View>
      <Text numberOfLines={1} style={[styles.cardValue, { color: colors.text }]}>
        {entry.value}
      </Text>
      <Text numberOfLines={1} style={[styles.cardCaption, { color: colors.muted }]}>
        {entry.caption ?? ' '}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  gridAd: {
    width: '100%',
    marginVertical: spacing.xs,
  },
  card: {
    width: '48%',
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  cardTitle: {
    ...typography.caption,
    flex: 1,
  },
  cardValue: {
    ...typography.title,
  },
  cardCaption: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  skeletonCard: {
    borderRadius: 20,
  },
});
