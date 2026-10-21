import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  Button,
  Card,
  CopyableText,
  EmptyState,
  InfoSheet,
  Screen,
  SectionHeader,
  Skeleton,
} from '@/design-system/components';
import { useSystemSettings } from '@/core/hooks/use-system-settings';
import { useTheme } from '@/design-system/theme';
import { spacing, typography } from '@/design-system/tokens';
import { HorizontalBars } from '@/features/apps/components/analyzer-charts';
import { useAppOverview } from '@/features/apps/hooks/use-app-overview';
import {
  appsByDangerousPermissions,
  appsByInstaller,
  appsByInstallYear,
  appsBySizeBucket,
  appsByTargetSdk,
} from '@/features/apps/services/apps-service';

const ANALYZER_SHEET = {
  title: 'App analyzer: what this means',
  paragraphs: [
    'Every chart counts apps with a launcher icon. Android only shows those to an app when its manifest asks for the launcher intent — this app does, and it never asks for QUERY_ALL_PACKAGES.',
    'Target SDK is the Android version each app was built for; older targets can mean the app has not been updated for newer Android behaviour.',
    'The installer chart uses Android’s install source: “Google Play” is the Play Store package, “Other installer” is anyone else (another store or a direct install), and “Not reported” means Android returned nothing.',
    'Install year comes from Android’s first-install date; dangerous-permission counts come from each app’s manifest declarations. Size buckets use the Usage-Access size scan, so they stay hidden until you allow Usage Access.',
    'Nothing is uploaded — every count is computed on this phone.',
  ],
};

/** The app analyzer overview: animated charts over every launcher app. */
export function AppAnalyzerScreen() {
  const { colors } = useTheme();
  const { notice, open } = useSystemSettings();
  const { overview, storage, usageAccess } = useAppOverview();
  const [sheetVisible, setSheetVisible] = useState(false);

  const apps = useMemo(() => (overview?.status === 'ok' ? overview.value : []), [overview]);
  const storageValue = storage?.status === 'ok' ? storage.value : null;
  const sizeBars = useMemo(() => appsBySizeBucket(apps, storageValue), [apps, storageValue]);
  const targetBars = useMemo(() => appsByTargetSdk(apps), [apps]);
  const installerBars = useMemo(() => appsByInstaller(apps), [apps]);
  const installYearBars = useMemo(() => appsByInstallYear(apps), [apps]);
  const permissionBars = useMemo(() => appsByDangerousPermissions(apps), [apps]);
  const systemCount = apps.filter((app) => app.system).length;
  const userCount = apps.length - systemCount;
  const overviewCopy = `${apps.length} apps with a launcher icon · ${userCount} user · ${systemCount} system`;
  const barsCopy = (bars: { label: string; count: number }[]): string | undefined =>
    bars.length > 0 ? bars.map((bar) => `${bar.label}: ${bar.count}`).join('\n') : undefined;

  return (
    <Screen scroll contentStyle={styles.content}>
      {overview === null ? (
        <AnalyzerSkeleton />
      ) : overview.status !== 'ok' ? (
        <EmptyState
          icon="apps"
          title="Not available on this device"
          message={overview.status === 'unavailable' ? overview.reason : 'Permission needed.'}
        />
      ) : (
        <>
          <SectionHeader
            title="Overview"
            copyText={overviewCopy}
            onInfo={() => setSheetVisible(true)}
          />
          <Card>
            <View style={styles.cardBody}>
              <CopyableText
                value={String(apps.length)}
                copyLabel="Launcher apps"
                style={[styles.total, { color: colors.text }]}
              >
                {apps.length}
              </CopyableText>
              <CopyableText
                value={overviewCopy}
                copyLabel="Apps overview"
                style={[styles.caption, { color: colors.muted }]}
              >
                apps with a launcher icon · {userCount} user · {systemCount} system
              </CopyableText>
            </View>
          </Card>

          <SectionHeader title="Target SDK" copyText={barsCopy(targetBars)} />
          <Card>
            <View style={styles.cardBody}>
              {targetBars.length === 0 ? (
                <Text style={[styles.caption, { color: colors.muted }]}>
                  Android did not report a target SDK for these apps.
                </Text>
              ) : (
                <HorizontalBars bars={targetBars} />
              )}
            </View>
          </Card>

          <SectionHeader title="Installer" copyText={barsCopy(installerBars)} />
          <Card>
            <View style={styles.cardBody}>
              <HorizontalBars bars={installerBars} />
            </View>
          </Card>

          <SectionHeader title="Install year" copyText={barsCopy(installYearBars)} />
          <Card>
            <View style={styles.cardBody}>
              {installYearBars.length === 0 ? (
                <Text style={[styles.caption, { color: colors.muted }]}>
                  Android did not report any install dates.
                </Text>
              ) : (
                <HorizontalBars bars={installYearBars} />
              )}
            </View>
          </Card>

          <SectionHeader title="Dangerous permissions" copyText={barsCopy(permissionBars)} />
          <Card>
            <View style={styles.cardBody}>
              <HorizontalBars bars={permissionBars} />
              <Text style={[styles.caption, { color: colors.muted }]}>
                How many dangerous (runtime) permissions each app declares. Open an app’s detail to
                see the names.
              </Text>
            </View>
          </Card>

          <SectionHeader title="Size buckets" copyText={barsCopy(sizeBars)} />
          <Card>
            <View style={styles.cardBody}>
              {usageAccess === false ? (
                <>
                  <Text style={[styles.caption, { color: colors.muted }]}>
                    Android hides app sizes until you allow Usage Access. The other charts do not
                    need it.
                  </Text>
                  <Button
                    title="Open Usage Access settings"
                    icon="settings"
                    variant="secondary"
                    onPress={() => open('usage-access')}
                  />
                </>
              ) : storage === null ? (
                <View style={styles.skeleton}>
                  <Skeleton height={16} />
                  <Skeleton width="70%" height={16} />
                </View>
              ) : sizeBars.length === 0 ? (
                <Text style={[styles.caption, { color: colors.muted }]}>
                  Android did not report any app sizes.
                </Text>
              ) : (
                <>
                  <HorizontalBars bars={sizeBars} />
                  <Text style={[styles.caption, { color: colors.muted }]}>
                    {storageValue?.length ?? 0} of {apps.length} apps had a readable size.
                  </Text>
                </>
              )}
              {notice ? (
                <Text style={[styles.caption, { color: colors.muted }]}>{notice}</Text>
              ) : null}
            </View>
          </Card>
        </>
      )}

      <InfoSheet
        visible={sheetVisible}
        title={ANALYZER_SHEET.title}
        paragraphs={ANALYZER_SHEET.paragraphs}
        onClose={() => setSheetVisible(false)}
      />
    </Screen>
  );
}

function AnalyzerSkeleton() {
  return (
    <View style={styles.content}>
      {[0, 1, 2].map((card) => (
        <Card key={card}>
          <View style={styles.cardBody}>
            <Skeleton width="40%" height={14} />
            <Skeleton height={16} />
            <Skeleton width="75%" height={16} />
          </View>
        </Card>
      ))}
    </View>
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
  total: {
    ...typography.display,
  },
  caption: {
    ...typography.caption,
  },
  skeleton: {
    gap: spacing.sm,
  },
});
