import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  AdSlot,
  Card,
  Chip,
  CopyableText,
  EmptyState,
  InfoSheet,
  PermissionBanner,
  Screen,
  SectionHeader,
  Skeleton,
} from '@/design-system/components';
import { PressableScale } from '@/design-system/animations/pressable-scale';
import { StaggerItem } from '@/design-system/animations/stagger';
import { withAlpha } from '@/design-system/color';
import { Icon, type IconName } from '@/design-system/icon';
import { useTheme } from '@/design-system/theme';
import { radius, spacing, typography } from '@/design-system/tokens';
import { AppRow } from '@/features/apps/components/app-row';
import { useApps } from '@/features/apps/hooks/use-apps';
import { useInstalledSizes } from '@/features/apps/hooks/use-installed-sizes';
import { useUsageAccess } from '@/features/apps/hooks/use-usage-access';
import { selectApps, storageSizesMap } from '@/features/apps/services/apps-service';
import type { AppFilter, AppSort } from '@/features/apps/types';

const FILTERS: { key: AppFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'user', label: 'User apps' },
  { key: 'system', label: 'System apps' },
];

const SORTS: { key: AppSort; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'size', label: 'Size' },
  { key: 'installed', label: 'Installed' },
  { key: 'updated', label: 'Updated' },
  { key: 'targetSdk', label: 'Target SDK' },
];

const APPS_SHEET = {
  title: 'Installed apps: what this means',
  paragraphs: [
    'The list covers apps with a launcher icon. Android 11 and newer only show those to an app when the manifest asks for the launcher intent — which this app does — and Device Matrix never asks for QUERY_ALL_PACKAGES, so apps without a launcher icon stay invisible.',
    'Version, install and update dates, minimum and target SDK, and the installer come from Android’s PackageManager. “Not reported” means Android returned nothing for that field.',
    'Size, cache and screen time need Usage Access (Settings › Special app access › Usage access). Without it Android hides those numbers and this screen says so; nothing is estimated.',
    '“Min” and “Target” are API levels: the oldest Android the app supports and the Android version it was built for.',
  ],
};

type ExploreTarget = {
  icon: IconName;
  title: string;
  subtitle: string;
  onPress: () => void;
};

/** Apps, the analyzer links and the installed-app list with search, filter and sort. */
export function AppsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { apps, refreshing, refresh } = useApps();
  const { granted, notice, openSettings } = useUsageAccess();
  const storage = useInstalledSizes(granted);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<AppFilter>('all');
  const [sort, setSort] = useState<AppSort>('name');
  const [sheetVisible, setSheetVisible] = useState(false);

  const all = useMemo(() => (apps?.status === 'ok' ? apps.value : []), [apps]);
  const sizes = useMemo(
    () => (storage?.status === 'ok' ? storageSizesMap(storage.value) : null),
    [storage],
  );
  const cacheSizes = useMemo(
    () =>
      storage?.status === 'ok'
        ? new Map(storage.value.map((entry) => [entry.packageName, entry.cacheBytes]))
        : null,
    [storage],
  );
  const visible = useMemo(
    () => selectApps(all, { query, filter, sort }, sizes),
    [all, query, filter, sort, sizes],
  );
  const installedCopy =
    visible.length > 0
      ? visible.map((app) => `${app.label} (${app.packageName})`).join('\n')
      : undefined;

  const explore: ExploreTarget[] = [
    {
      icon: 'gauge',
      title: 'App analyzer',
      subtitle: 'Charts for target SDK, installer, install year, sizes and permissions',
      onPress: () => router.push('/app-analyzer'),
    },
    {
      icon: 'search',
      title: 'Permission analyzer',
      subtitle: 'Pick a permission and see which apps request it and which Android grants',
      onPress: () => router.push('/permission-analyzer'),
    },
    {
      icon: 'clock',
      title: 'Screen time',
      subtitle: 'Today and the last 7 days, ranked apps, a daily chart and last-used times',
      onPress: () => router.push('/screen-time'),
    },
  ];

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

      {sort === 'size' && granted !== true ? (
        <Text style={[styles.caption, { color: colors.muted }]}>
          Size sorting needs Usage Access. Until it is allowed, apps without a reported size stay in
          name order at the end.
        </Text>
      ) : null}

      {granted === false ? (
        <PermissionBanner
          icon="apps"
          title="Usage Access is off"
          message="App sizes, cache sizes and screen time stay hidden until you allow Usage Access. The app list, search and every detail keep working."
          actionLabel="Open settings"
          onAction={openSettings}
        />
      ) : null}

      <SectionHeader title="Explore" />
      {explore.map((target) => (
        <Card key={target.title} onPress={target.onPress}>
          <View style={styles.linkRow}>
            <View style={[styles.linkBadge, { backgroundColor: withAlpha(colors.accent, 0.12) }]}>
              <Icon name={target.icon} size={20} color={colors.accent} />
            </View>
            <View style={styles.linkLabels}>
              <Text style={[styles.linkTitle, { color: colors.text }]}>{target.title}</Text>
              <Text style={[styles.caption, { color: colors.muted }]}>{target.subtitle}</Text>
            </View>
            <Icon name="chevron-right" size={20} color={colors.muted} />
          </View>
        </Card>
      ))}

      <AdSlot placement="apps-header" />

      <SectionHeader
        title="Installed apps"
        copyText={installedCopy}
        onInfo={() => setSheetVisible(true)}
        action={
          apps?.status === 'ok' ? (
            <CopyableText
              value={`${visible.length} of ${all.length}`}
              copyLabel="App count"
              style={[styles.count, { color: colors.muted }]}
            >
              {visible.length} of {all.length}
            </CopyableText>
          ) : null
        }
      />
      {notice ? <Text style={[styles.caption, { color: colors.muted }]}>{notice}</Text> : null}
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
        renderItem={({ item, index }) => {
          const row = (
            <AppRow
              app={item}
              sizeBytes={sizes?.get(item.packageName) ?? null}
              cacheBytes={cacheSizes?.get(item.packageName) ?? null}
              onPress={() =>
                router.push({
                  pathname: '/apps/[package]',
                  params: { package: item.packageName },
                })
              }
            />
          );
          return (
            <>
              {index < 14 ? <StaggerItem index={Math.min(index, 10)}>{row}</StaggerItem> : row}
              {index === 8 ? <AdSlot placement="apps-list" style={styles.listAd} /> : null}
            </>
          );
        }}
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
      <InfoSheet
        visible={sheetVisible}
        title={APPS_SHEET.title}
        paragraphs={APPS_SHEET.paragraphs}
        onClose={() => setSheetVisible(false)}
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
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  controlLabel: {
    ...typography.caption,
    width: 34,
    paddingTop: 8,
  },
  chips: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  caption: {
    ...typography.caption,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  linkBadge: {
    width: 40,
    height: 40,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkLabels: {
    flex: 1,
    gap: 2,
  },
  linkTitle: {
    ...typography.body,
    fontFamily: 'Inter_600SemiBold',
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
  listAd: {
    marginVertical: spacing.md,
  },
});
