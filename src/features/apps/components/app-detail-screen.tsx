import { Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import {
  Button,
  Card,
  Chip,
  EmptyState,
  Screen,
  SectionHeader,
  Skeleton,
  StatRow,
} from '@/design-system/components';
import { useTheme } from '@/design-system/theme';
import { spacing, typography } from '@/design-system/tokens';
import { AppIcon } from '@/features/apps/components/app-icon';
import { useAppDetail } from '@/features/apps/hooks/use-app-detail';
import { formatAppDateTime } from '@/features/apps/services/apps-service';

const NOT_AVAILABLE = 'Not available on this device';

/** One app's full metadata plus the "Open App info" hand-off. */
export function AppDetailScreen({ packageName }: { packageName: string }) {
  const { colors } = useTheme();
  const { app, notice, openInfo } = useAppDetail(packageName);
  const loaded = app?.status === 'ok' ? app.value : null;

  if (app != null && app.status !== 'ok') {
    return (
      <Screen scroll contentStyle={styles.content}>
        <Stack.Screen options={{ title: 'App details' }} />
        <EmptyState
          icon="apps"
          title={app.status === 'unavailable' ? 'Not available on this device' : 'Permission needed'}
          message={app.status === 'unavailable' ? app.reason : undefined}
        />
      </Screen>
    );
  }

  if (loaded == null) {
    return (
      <Screen scroll contentStyle={styles.content}>
        <Stack.Screen options={{ title: 'App details' }} />
        <Card>
          <View style={styles.cardBody}>
            <Skeleton width="40%" height={14} />
            <Skeleton height={16} />
            <Skeleton width="75%" height={16} />
            <Skeleton width="60%" height={16} />
          </View>
        </Card>
      </Screen>
    );
  }

  const version =
    loaded.versionName != null && loaded.versionName !== '' ? loaded.versionName : NOT_AVAILABLE;

  return (
    <Screen scroll contentStyle={styles.content}>
      <Stack.Screen options={{ title: loaded.label }} />

      <Card>
        <View style={styles.head}>
          <AppIcon icon={loaded.icon} label={loaded.label} size={56} />
          <View style={styles.headText}>
            <Text style={[styles.title, { color: colors.text }]}>{loaded.label}</Text>
            <Text numberOfLines={2} style={[styles.package, { color: colors.muted }]}>
              {loaded.packageName}
            </Text>
            <Chip label={loaded.system ? 'System app' : 'User app'} />
          </View>
        </View>
      </Card>

      <Card>
        <View style={styles.cardBody}>
          <SectionHeader title="Details" />
          <StatRow label="Package" value={loaded.packageName} />
          <StatRow label="Version" value={version} />
          <StatRow
            label="Version code"
            value={loaded.versionCode != null ? String(loaded.versionCode) : NOT_AVAILABLE}
          />
          <StatRow
            label="Target SDK"
            value={loaded.targetSdk != null ? `API ${loaded.targetSdk}` : NOT_AVAILABLE}
          />
          <StatRow
            label="Installed"
            value={formatAppDateTime(loaded.firstInstallTimeMs) ?? NOT_AVAILABLE}
          />
          <StatRow
            label="Updated"
            value={formatAppDateTime(loaded.lastUpdateTimeMs) ?? NOT_AVAILABLE}
          />
        </View>
      </Card>

      <Button title="Open App info" icon="settings" variant="secondary" onPress={openInfo} />
      {notice ? <Text style={[styles.notice, { color: colors.muted }]}>{notice}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  cardBody: {
    gap: spacing.sm,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headText: {
    flex: 1,
    gap: spacing.xs,
    alignItems: 'flex-start',
  },
  title: {
    ...typography.title,
  },
  package: {
    ...typography.caption,
    fontFamily: 'JetBrainsMono_400Regular',
  },
  notice: {
    ...typography.caption,
  },
});
