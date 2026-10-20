import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  Card,
  Chip,
  EmptyState,
  InfoSheet,
  PermissionBanner,
  Screen,
  SectionHeader,
  Skeleton,
} from '@/design-system/components';
import { PressableScale } from '@/design-system/animations/pressable-scale';
import { Icon } from '@/design-system/icon';
import { useTheme } from '@/design-system/theme';
import { spacing, typography } from '@/design-system/tokens';
import { AppIcon } from '@/features/apps/components/app-icon';
import { usePermissionAnalyzer } from '@/features/apps/hooks/use-permission-analyzer';
import { PERMISSION_GROUPS, openAppInfoSettings } from '@/features/apps/services/apps-service';

const PERMISSIONS_SHEET = {
  title: 'Permission analyzer: what this means',
  paragraphs: [
    'An app is listed here when its manifest declares one of the selected permission names. Android’s installed-app database is the only source — this app never asks for QUERY_ALL_PACKAGES, so the list covers apps with a launcher icon.',
    '“Granted” means Android currently grants at least one of the matching permissions to that app. “Not granted” means the app declared it but Android does not allow it right now; some permissions can also be granted only while the app is in use.',
    'Reading other apps’ permissions does not need any permission on your side, and nothing is changed here. Tapping a row opens the system App info screen — changing a grant happens only there, under Android’s control.',
    'Normal and signature permissions are granted automatically at install, so they usually read as granted; runtime permissions are the ones you allow in a dialog.',
  ],
};

function shortPermissionName(name: string): string {
  const index = name.lastIndexOf('.');
  return index >= 0 ? name.slice(index + 1) : name;
}

/** Permission analyzer: pick a permission, see which apps request it. */
export function PermissionAnalyzerScreen() {
  const { colors } = useTheme();
  const { apps, group, groupKey, setGroupKey, reading, rows } = usePermissionAnalyzer();
  const [sheetVisible, setSheetVisible] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const openInfo = (packageName: string) => {
    const result = openAppInfoSettings(packageName);
    setNotice(
      result.status === 'ok' ? null : result.status === 'unavailable' ? result.reason : null,
    );
  };

  return (
    <Screen scroll contentStyle={styles.content}>
      <SectionHeader title="Permission" onInfo={() => setSheetVisible(true)} />
      <View style={styles.chips}>
        {PERMISSION_GROUPS.map((entry) => (
          <Chip
            key={entry.key}
            label={entry.label}
            selected={groupKey === entry.key}
            onPress={() => setGroupKey(entry.key)}
          />
        ))}
      </View>

      {apps?.status !== 'ok' && apps !== null ? (
        <PermissionBanner
          icon="apps"
          title="The app list is not available"
          message="Android did not return the installed-app list, so labels and icons cannot be joined to the permission reading."
        />
      ) : null}

      <SectionHeader
        title={`Apps requesting ${group?.label ?? 'this permission'}`}
        action={
          reading?.status === 'ok' ? (
            <Text style={[styles.count, { color: colors.muted }]}>{rows.length}</Text>
          ) : null
        }
      />

      {reading == null ? (
        <Card>
          <View style={styles.cardBody}>
            {[0, 1, 2].map((row) => (
              <Skeleton key={row} height={40} />
            ))}
          </View>
        </Card>
      ) : reading.status !== 'ok' ? (
        <Card>
          <Text style={[styles.text, { color: colors.muted }]}>
            {reading.status === 'unavailable' ? reading.reason : 'Permission needed.'}
          </Text>
        </Card>
      ) : rows.length === 0 ? (
        <EmptyState
          icon="search"
          title="No apps request this permission"
          message="No app with a launcher icon declares the selected permission on this phone."
        />
      ) : (
        <Card>
          <View style={styles.cardBody}>
            {rows.map((row, index) => (
              <PressableScale
                key={row.packageName}
                onPress={() => openInfo(row.packageName)}
                accessibilityRole="button"
                accessibilityLabel={`${row.label}, ${
                  row.granted ? 'granted' : 'not granted'
                }. Opens the system App info screen.`}
                style={[
                  styles.row,
                  index > 0
                    ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }
                    : null,
                ]}
              >
                <AppIcon icon={row.icon} label={row.label} size={36} />
                <View style={styles.rowBody}>
                  <Text numberOfLines={1} style={[styles.rowLabel, { color: colors.text }]}>
                    {row.label}
                  </Text>
                  <Text numberOfLines={1} style={[styles.rowPackage, { color: colors.muted }]}>
                    {row.packageName}
                  </Text>
                  <Text numberOfLines={2} style={[styles.rowCaption, { color: colors.muted }]}>
                    {row.requested.map(shortPermissionName).join(', ')}
                    {` · ${row.grantedCount} of ${row.requestedCount} granted`}
                  </Text>
                </View>
                <View style={styles.rowTrailing}>
                  <Chip
                    label={row.granted ? 'Granted' : 'Not granted'}
                    dotColor={row.granted ? colors.good : colors.critical}
                  />
                  <Icon name="chevron-right" size={16} color={colors.muted} />
                </View>
              </PressableScale>
            ))}
          </View>
        </Card>
      )}

      {notice ? <Text style={[styles.caption, { color: colors.muted }]}>{notice}</Text> : null}
      <Text style={[styles.caption, { color: colors.muted }]}>
        Tap a row to open Android’s App info screen for that app.
      </Text>

      <InfoSheet
        visible={sheetVisible}
        title={PERMISSIONS_SHEET.title}
        paragraphs={PERMISSIONS_SHEET.paragraphs}
        onClose={() => setSheetVisible(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  cardBody: {
    gap: spacing.sm,
  },
  count: {
    ...typography.caption,
    fontFamily: 'JetBrainsMono_400Regular',
  },
  text: {
    ...typography.body,
  },
  caption: {
    ...typography.caption,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    ...typography.body,
    fontFamily: 'Inter_600SemiBold',
  },
  rowPackage: {
    ...typography.caption,
    fontFamily: 'JetBrainsMono_400Regular',
  },
  rowCaption: {
    ...typography.caption,
  },
  rowTrailing: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
});
