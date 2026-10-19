import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  AdSlot,
  Chip,
  EmptyState,
  Screen,
  SectionHeader,
  Skeleton,
} from '@/design-system/components';
import { PressableScale } from '@/design-system/animations/pressable-scale';
import { Icon } from '@/design-system/icon';
import { useTheme } from '@/design-system/theme';
import { radius, spacing, typography } from '@/design-system/tokens';
import { AppRow } from '@/features/apps/components/app-row';
import { UsagePanel } from '@/features/apps/components/usage-panel';
import { useAppUsage } from '@/features/apps/hooks/use-app-usage';
import { useApps } from '@/features/apps/hooks/use-apps';
import { useUsageAccess } from '@/features/apps/hooks/use-usage-access';
import { selectApps } from '@/features/apps/services/apps-service';
import type { AppFilter, AppSort } from '@/features/apps/types';

const FILTERS: { key: AppFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'user', label: 'User apps' },
  { key: 'system', label: 'System apps' },
];

const SORTS: { key: AppSort; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'installed', label: 'Newest' },
  { key: 'updated', label: 'Updated' },
];

/** Apps and usage insights: the launcher list plus screen time and sizes. */
export function AppsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { apps, refreshing, refresh } = useApps();
  const { granted, notice, openSettings } = useUsageAccess();
  const { usage, range, setRange, storage, scanStorage } = useAppUsage(granted);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<AppFilter>('all');
  const [sort, setSort] = useState<AppSort>('name');

  const all = useMemo(() => (apps?.status === 'ok' ? apps.value : []), [apps]);
  const visible = useMemo(
    () => selectApps(all, { query, filter, sort }),
    [all, query, filter, sort],
  );

  const header = (
    <View style={styles.header}>
      <View
        style={[styles.search, { backgroundColor: colors.surface2, borderColor: colors.border }]}
      >
        <Icon name="search" size={20} color={colors.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search name or package"
          placeholderTextColor={colors.muted}
          style={[styles.searchInput, { color: colors.text }]}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          accessibilityLabel="Search apps"
        />
        {query !== '' ? (
          <PressableScale
            onPress={() => setQuery('')}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            hitSlop={16}
          >
            <Icon name="x" size={16} color={colors.muted} />
          </PressableScale>
        ) : null}
      </View>

      <View style={styles.controls}>
        <Text style={[styles.controlLabel, { color: colors.muted }]}>Filter</Text>
        <View style={styles.chips}>
          {FILTERS.map((item) => (
            <Chip
              key={item.key}
              label={item.label}
              selected={filter === item.key}
              onPress={() => setFilter(item.key)}
            />
          ))}
        </View>
      </View>

      <View style={styles.controls}>
        <Text style={[styles.controlLabel, { color: colors.muted }]}>Sort</Text>
        <View style={styles.chips}>
          {SORTS.map((item) => (
            <Chip
              key={item.key}
              label={item.label}
              selected={sort === item.key}
              onPress={() => setSort(item.key)}
            />
          ))}
        </View>
      </View>

      <UsagePanel
        granted={granted}
        apps={all}
        usage={usage}
        range={range}
        onRangeChange={setRange}
        storage={storage}
        onScanStorage={scanStorage}
        onOpenSettings={openSettings}
        notice={notice}
      />

      <AdSlot />

      <SectionHeader
        title="Installed apps"
        action={
          apps?.status === 'ok' ? (
            <Text style={[styles.count, { color: colors.muted }]}>
              {visible.length} of {all.length}
            </Text>
          ) : null
        }
      />
    </View>
  );

  const empty = (
    <View style={styles.empty}>
      {apps == null ? (
        <View style={styles.skeleton}>
          {[0, 1, 2, 3].map((row) => (
            <Skeleton key={row} height={40} />
          ))}
        </View>
      ) : apps.status !== 'ok' ? (
        <EmptyState
          icon="apps"
          title="Not available on this device"
          message={apps.status === 'unavailable' ? apps.reason : 'Permission needed.'}
        />
      ) : (
        <EmptyState
          icon="search"
          title="No apps match"
          message="Try a different search, or switch the filter back to All."
        />
      )}
    </View>
  );

  return (
    <Screen padded={false}>
      <FlatList
        data={visible}
        keyExtractor={(item) => item.packageName}
        renderItem={({ item }) => (
          <AppRow
            app={item}
            onPress={() =>
              router.push({
                pathname: '/apps/[package]',
                params: { package: item.packageName },
              })
            }
          />
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: colors.border }]} />
        )}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={7}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            colors={[colors.accent]}
            progressBackgroundColor={colors.surface2}
            tintColor={colors.accent}
          />
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    gap: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 48,
    borderRadius: radius.button,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    ...typography.body,
    flex: 1,
    alignSelf: 'stretch',
    textAlignVertical: 'center',
    padding: 0,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  controlLabel: {
    ...typography.caption,
    width: 34,
  },
  chips: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  count: {
    ...typography.caption,
    fontFamily: 'JetBrainsMono_400Regular',
  },
  empty: {
    paddingTop: spacing.sm,
  },
  skeleton: {
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
});
