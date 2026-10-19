import { StyleSheet, Text, View } from 'react-native';

import type { InstalledApp } from '@/core/native';
import { PressableScale } from '@/design-system/animations/pressable-scale';
import { Icon } from '@/design-system/icon';
import { useTheme } from '@/design-system/theme';
import { spacing, typography } from '@/design-system/tokens';
import { AppIcon } from '@/features/apps/components/app-icon';
import { formatAppDate } from '@/features/apps/services/apps-service';

type Props = {
  app: InstalledApp;
  onPress: () => void;
};

/** One installed app: icon, name, package, version and install date. */
export function AppRow({ app, onPress }: Props) {
  const { colors } = useTheme();
  const installed = formatAppDate(app.firstInstallTimeMs);
  const version = app.versionName != null && app.versionName !== '' ? app.versionName : null;

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${app.label}${version ? `, version ${version}` : ''}${
        installed ? `, installed ${installed}` : ''
      }`}
      style={styles.row}
    >
      <AppIcon icon={app.icon} label={app.label} size={40} />
      <View style={styles.text}>
        <Text numberOfLines={1} style={[styles.label, { color: colors.text }]}>
          {app.label}
        </Text>
        <Text numberOfLines={1} style={[styles.subtitle, { color: colors.muted }]}>
          {app.packageName}
          {version ? ` · v${version}` : ''}
        </Text>
      </View>
      <View style={styles.meta}>
        {installed ? <Text style={[styles.date, { color: colors.muted }]}>{installed}</Text> : null}
        <Icon name="chevron-right" size={16} color={colors.muted} />
      </View>
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
  text: {
    flex: 1,
    gap: 2,
  },
  label: {
    ...typography.body,
    fontFamily: 'Inter_600SemiBold',
  },
  subtitle: {
    ...typography.caption,
    fontFamily: 'JetBrainsMono_400Regular',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  date: {
    ...typography.caption,
  },
});
