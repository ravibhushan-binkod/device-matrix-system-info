import { StyleSheet, Text, View } from 'react-native';

import type { InstalledApp } from '@/core/native';
import { formatByteSize } from '@/core/utils/format-bytes';
import { PressableScale } from '@/design-system/animations/pressable-scale';
import { copyValue } from '@/design-system/copy/copy-value';
import { Icon } from '@/design-system/icon';
import { useTheme } from '@/design-system/theme';
import { spacing, typography } from '@/design-system/tokens';
import { AppIcon } from '@/features/apps/components/app-icon';
import { formatAppDate, installerDisplayName } from '@/features/apps/services/apps-service';

type Props = {
  app: InstalledApp;
  /** App + data bytes from the Usage-Access scan; null while unknown. */
  sizeBytes: number | null;
  /** Cache bytes from the same scan; null while unknown. */
  cacheBytes: number | null;
  onPress: () => void;
};

/** One installed app: icon, name, package, version, installer, SDKs, dates and sizes. */
export function AppRow({ app, sizeBytes, cacheBytes, onPress }: Props) {
  const { colors } = useTheme();
  const installed = formatAppDate(app.firstInstallTimeMs);
  const updated = formatAppDate(app.lastUpdateTimeMs);
  const version = app.versionName != null && app.versionName !== '' ? app.versionName : null;
  const installer = installerDisplayName(app);
  const size = sizeBytes != null ? formatByteSize(sizeBytes) : '—';

  return (
    <PressableScale
      onPress={onPress}
      onLongPress={() => void copyValue(app.packageName, app.label)}
      delayLongPress={320}
      accessibilityRole="button"
      accessibilityLabel={`${app.label}${version ? `, version ${version}` : ''}, installed ${
        installed ?? 'not reported'
      }, installer ${installer}${sizeBytes != null ? `, size ${size}` : ''}`}
      accessibilityHint="Long press to copy the package name"
      style={styles.row}
    >
      <AppIcon icon={app.icon} label={app.label} size={44} />
      <View style={styles.body}>
        <View style={styles.head}>
          <Text numberOfLines={1} style={[styles.label, { color: colors.text }]}>
            {app.label}
          </Text>
          <Text style={[styles.size, { color: sizeBytes != null ? colors.text : colors.muted }]}>
            {size}
          </Text>
        </View>
        <Text numberOfLines={1} style={[styles.package, { color: colors.muted }]}>
          {app.packageName}
          {version ? ` · v${version}` : ''}
        </Text>
        <Text numberOfLines={1} style={[styles.meta, { color: colors.muted }]}>
          {installer} · Min {app.minSdk ?? '—'} · Target {app.targetSdk ?? '—'}
        </Text>
        <Text numberOfLines={1} style={[styles.meta, { color: colors.muted }]}>
          Installed {installed ?? '—'} · Updated {updated ?? '—'}
          {cacheBytes != null ? ` · Cache ${formatByteSize(cacheBytes)}` : ''}
        </Text>
      </View>
      <Icon name="chevron-right" size={16} color={colors.muted} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  label: {
    ...typography.body,
    fontFamily: 'Inter_600SemiBold',
    flex: 1,
  },
  size: {
    ...typography.mono,
  },
  package: {
    ...typography.caption,
    fontFamily: 'JetBrainsMono_400Regular',
  },
  meta: {
    ...typography.caption,
  },
});
