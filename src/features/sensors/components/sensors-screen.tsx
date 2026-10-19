import { useRouter } from 'expo-router';
import { Fragment, useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { PressableScale } from '@/design-system/animations/pressable-scale';
import { AdSlot, Card, EmptyState, Screen, Skeleton } from '@/design-system/components';
import { Icon } from '@/design-system/icon';
import { useTheme } from '@/design-system/theme';
import { radius, spacing, typography } from '@/design-system/tokens';
import { useSensors } from '@/features/sensors/hooks/use-sensors';
import { filterSensorRows, toSensorRows } from '@/features/sensors/services/sensor-service';

/** Rows per card group; a banner follows each of the first two groups. */
const SENSOR_ROWS_PER_GROUP = 9;
const MAX_SENSOR_LIST_ADS = 2;

/** Sensors: searchable list; every row opens the live detail screen. */
export function SensorsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { sensors } = useSensors();
  const [query, setQuery] = useState('');

  const data = useMemo(() => {
    if (sensors?.status !== 'ok') return null;
    const all = toSensorRows(sensors.value);
    return { all, filtered: filterSensorRows(all, query) };
  }, [sensors, query]);

  return (
    <Screen scroll contentStyle={styles.content}>
      {sensors === null ? (
        <SensorsSkeleton />
      ) : data === null ? (
        <EmptyState
          icon="sensors"
          title="Sensors"
          message={
            sensors.status === 'unavailable'
              ? sensors.reason
              : sensors.status === 'denied'
                ? `Permission needed: ${sensors.permission}`
                : 'Android did not report any sensors on this device.'
          }
        />
      ) : (
        <>
          <SearchField value={query} onChangeText={setQuery} />
          <Text style={[styles.count, { color: colors.muted }]}>
            {data.filtered.length === data.all.length
              ? `${data.all.length} sensors`
              : `${data.filtered.length} of ${data.all.length} sensors`}
          </Text>
          {data.filtered.length === 0 ? (
            <Card>
              <Text style={[styles.emptyText, { color: colors.muted }]}>
                No sensors match &ldquo;{query.trim()}&rdquo;.
              </Text>
            </Card>
          ) : (
            chunkRows(data.filtered, SENSOR_ROWS_PER_GROUP).map((group, groupIndex, groups) => (
              <Fragment key={groupIndex}>
                <Card>
                  {group.map((row, index) => (
                    <PressableScale
                      key={row.key}
                      onPress={() =>
                        router.push({
                          pathname: '/sensors/[type]',
                          params: { type: String(row.type) },
                        })
                      }
                      accessibilityRole="button"
                      style={[
                        styles.row,
                        index > 0
                          ? {
                              borderTopWidth: StyleSheet.hairlineWidth,
                              borderTopColor: colors.border,
                            }
                          : null,
                      ]}
                    >
                      <View style={styles.rowLabels}>
                        <Text numberOfLines={1} style={[styles.rowTitle, { color: colors.text }]}>
                          {row.label}
                        </Text>
                        <Text numberOfLines={1} style={[styles.caption, { color: colors.muted }]}>
                          {row.vendor.length > 0 ? row.vendor : row.name}
                          {row.wakeUp ? ' · Wake-up' : ''}
                        </Text>
                      </View>
                      <Icon name="chevron-right" size={20} color={colors.muted} />
                    </PressableScale>
                  ))}
                </Card>
                {groupIndex < groups.length - 1 && groupIndex < MAX_SENSOR_LIST_ADS ? (
                  <AdSlot placement="sensors-list" />
                ) : null}
              </Fragment>
            ))
          )}
        </>
      )}
    </Screen>
  );
}

function SearchField({
  value,
  onChangeText,
}: {
  value: string;
  onChangeText: (text: string) => void;
}) {
  const { colors } = useTheme();

  return (
    <View style={[styles.search, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
      <Icon name="search" size={20} color={colors.muted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Search sensors"
        placeholderTextColor={colors.muted}
        style={[styles.searchInput, { color: colors.text }]}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
      />
      {value.length > 0 ? (
        <PressableScale
          onPress={() => onChangeText('')}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          hitSlop={14}
        >
          <Icon name="x" size={20} color={colors.muted} />
        </PressableScale>
      ) : null}
    </View>
  );
}

/** Splits a list into fixed-size groups so a banner can separate them. */
function chunkRows<T>(rows: T[], size: number): T[][] {
  const groups: T[][] = [];
  for (let index = 0; index < rows.length; index += size) {
    groups.push(rows.slice(index, index + size));
  }
  return groups;
}

function SensorsSkeleton() {
  return (
    <View style={styles.content}>
      <Skeleton height={48} />
      <Card>
        <View style={styles.skeletonRows}>
          {[0, 1, 2, 3, 4].map((row) => (
            <Skeleton key={row} height={20} />
          ))}
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 48,
    paddingHorizontal: spacing.md,
    borderRadius: radius.button,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchInput: {
    flex: 1,
    alignSelf: 'stretch',
    textAlignVertical: 'center',
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    padding: 0,
  },
  count: {
    ...typography.caption,
  },
  emptyText: {
    ...typography.body,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  rowLabels: {
    flex: 1,
    gap: spacing.xs,
  },
  rowTitle: {
    ...typography.body,
    fontFamily: 'Inter_600SemiBold',
  },
  caption: {
    ...typography.caption,
  },
  skeletonRows: {
    gap: spacing.lg,
  },
});
