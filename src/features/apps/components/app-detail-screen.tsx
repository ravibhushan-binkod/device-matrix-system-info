import { Stack } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  Button,
  Card,
  Chip,
  CopyableText,
  CopyButton,
  CopyRow,
  EmptyState,
  InfoSheet,
  Screen,
  SectionHeader,
  Skeleton,
} from '@/design-system/components';
import { isEnabled, features } from '@/core/features';
import { useSystemSettings } from '@/core/hooks/use-system-settings';
import { useTheme } from '@/design-system/theme';
import { spacing, typography } from '@/design-system/tokens';
import { formatByteSize } from '@/core/utils/format-bytes';
import { AppIcon } from '@/features/apps/components/app-icon';
import { useApkExport } from '@/features/apps/hooks/use-apk-export';
import { useAppDetail } from '@/features/apps/hooks/use-app-detail';
import { formatAppDateTime, installerDisplayName } from '@/features/apps/services/apps-service';
import type { AnalyzerPermission } from '@/core/native';

const NOT_AVAILABLE = 'Not available on this device';

const APP_SHEET = {
  title: 'App details: what this means',
  paragraphs: [
    'Every value comes from Android’s PackageManager for this installed package. “Not reported” means Android returned nothing — nothing here is estimated.',
    'Permissions are grouped by Android’s protection level: dangerous permissions are the runtime ones you allow in a dialog; normal and signature permissions are granted automatically at install (signature permissions only to apps signed with the same certificate).',
    'Activities, services, receivers and providers are the components declared in the app’s manifest. The signing SHA-256 is read from the installed APK’s signer.',
    'Native ABIs are the lib/ folders inside the APK (arm64-v8a, armeabi-v7a, x86_64…). “No native libraries” means the app is pure Java/Kotlin or ships no native code.',
    'App, data and cache sizes need Usage Access; Android hides StorageStatsManager from apps without it. The App info button opens Android’s own screen, where changes actually happen.',
  ],
};

function shortPermissionName(name: string): string {
  const index = name.lastIndexOf('.');
  return index >= 0 ? name.slice(index + 1) : name;
}

function shortComponentName(name: string): string {
  const index = name.lastIndexOf('.');
  return index >= 0 ? name.slice(index + 1) : name;
}

/** One app's full metadata, analyzer reading and system hand-offs. */
export function AppDetailScreen({ packageName }: { packageName: string }) {
  const { colors } = useTheme();
  const { notice: settingsNotice, open } = useSystemSettings();
  const { app, analyzer, notice, openInfo } = useAppDetail(packageName);
  const [sheetVisible, setSheetVisible] = useState(false);

  const loaded = app?.status === 'ok' ? app.value : null;
  const analysis = analyzer?.status === 'ok' ? analyzer.value : null;
  const apk = useApkExport(packageName, loaded?.label ?? packageName);
  const apkEnabled = isEnabled(features.apkExtraction);

  if (app != null && app.status !== 'ok') {
    return (
      <Screen scroll contentStyle={styles.content}>
        <Stack.Screen options={{ title: 'App details' }} />
        <EmptyState
          icon="apps"
          title={
            app.status === 'unavailable' ? 'Not available on this device' : 'Permission needed'
          }
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
  const minSdk = analysis?.minSdk ?? loaded.minSdk;
  const targetSdk = analysis?.targetSdk ?? loaded.targetSdk;
  const installer = installerDisplayName({
    installerPackage: analysis?.installerPackage ?? loaded.installerPackage,
    installerLabel: analysis?.installerLabel ?? loaded.installerLabel,
  });
  const installerPackage = analysis?.installerPackage ?? loaded.installerPackage;
  const hasSizes =
    analysis?.appBytes != null || analysis?.dataBytes != null || analysis?.cacheBytes != null;

  const permissions = analysis?.permissions ?? [];
  const dangerous = permissions
    .filter((permission) => permission.protection === 'dangerous')
    .sort(byPermissionName);
  const normal = permissions
    .filter((permission) => permission.protection === 'normal')
    .sort(byPermissionName);
  const signature = permissions
    .filter((permission) => permission.protection === 'signature')
    .sort(byPermissionName);
  const other = permissions
    .filter((permission) => permission.protection === 'other')
    .sort(byPermissionName);

  const detailsCopy = [
    `Package: ${loaded.packageName}`,
    `Version: ${version}`,
    `Version code: ${loaded.versionCode != null ? String(loaded.versionCode) : NOT_AVAILABLE}`,
    `Min SDK: ${minSdk != null ? `API ${minSdk}` : NOT_AVAILABLE}`,
    `Target SDK: ${targetSdk != null ? `API ${targetSdk}` : NOT_AVAILABLE}`,
    `Installed: ${formatAppDateTime(loaded.firstInstallTimeMs) ?? NOT_AVAILABLE}`,
    `Updated: ${formatAppDateTime(loaded.lastUpdateTimeMs) ?? NOT_AVAILABLE}`,
    `Installer: ${installer}`,
    `Installer package: ${installerPackage ?? NOT_AVAILABLE}`,
    `Debuggable: ${analysis == null ? 'Reading…' : analysis.debuggable ? 'Yes' : 'No'}`,
    `Native ABIs: ${
      analysis == null
        ? 'Reading…'
        : analysis.abis.length > 0
          ? analysis.abis.join(', ')
          : 'No native libraries'
    }`,
  ].join('\n');
  const storageCopy = hasSizes
    ? [
        `App size: ${
          analysis?.appBytes != null ? formatByteSize(analysis.appBytes) : NOT_AVAILABLE
        }`,
        `Data: ${analysis?.dataBytes != null ? formatByteSize(analysis.dataBytes) : NOT_AVAILABLE}`,
        `Cache: ${
          analysis?.cacheBytes != null ? formatByteSize(analysis.cacheBytes) : NOT_AVAILABLE
        }`,
      ].join('\n')
    : undefined;
  const signingCopy =
    analysis != null && analysis.signerSha256.length > 0
      ? analysis.signerSha256
          .map(
            (fingerprint, index) =>
              `${analysis.signerSha256.length > 1 ? `SHA-256 #${index + 1}` : 'SHA-256'}: ${fingerprint}`,
          )
          .join('\n')
      : undefined;
  const permissionsCopy =
    permissions.length > 0
      ? permissions
          .map(
            (permission) =>
              `${shortPermissionName(permission.name)}: ${
                permission.granted ? 'Granted' : 'Not granted'
              } (${permission.protection})`,
          )
          .join('\n')
      : undefined;
  const componentsCopy =
    analysis != null
      ? [
          `Activities: ${analysis.activities.length}`,
          ...analysis.activities.map((name) => `  ${name}`),
          `Services: ${analysis.services.length}`,
          ...analysis.services.map((name) => `  ${name}`),
          `Receivers: ${analysis.receivers.length}`,
          ...analysis.receivers.map((name) => `  ${name}`),
          `Providers: ${analysis.providers.length}`,
          ...analysis.providers.map((name) => `  ${name}`),
        ].join('\n')
      : undefined;

  return (
    <Screen scroll contentStyle={styles.content}>
      <Stack.Screen options={{ title: loaded.label }} />

      <Card>
        <View style={styles.head}>
          <AppIcon icon={loaded.icon} label={loaded.label} size={56} />
          <View style={styles.headText}>
            <CopyableText
              value={loaded.label}
              copyLabel="App name"
              style={[styles.title, { color: colors.text }]}
            >
              {loaded.label}
            </CopyableText>
            <CopyableText
              value={loaded.packageName}
              copyLabel="Package"
              numberOfLines={2}
              style={[styles.package, { color: colors.muted }]}
            >
              {loaded.packageName}
            </CopyableText>
            <Chip label={loaded.system ? 'System app' : 'User app'} />
          </View>
        </View>
      </Card>

      <SectionHeader title="Details" copyText={detailsCopy} onInfo={() => setSheetVisible(true)} />
      <Card>
        <View style={styles.cardBody}>
          <CopyRow label="Package" value={loaded.packageName} />
          <CopyRow label="Version" value={version} />
          <CopyRow
            label="Version code"
            value={loaded.versionCode != null ? String(loaded.versionCode) : NOT_AVAILABLE}
          />
          <CopyRow label="Min SDK" value={minSdk != null ? `API ${minSdk}` : NOT_AVAILABLE} />
          <CopyRow
            label="Target SDK"
            value={targetSdk != null ? `API ${targetSdk}` : NOT_AVAILABLE}
          />
          <CopyRow
            label="Installed"
            value={formatAppDateTime(loaded.firstInstallTimeMs) ?? NOT_AVAILABLE}
          />
          <CopyRow
            label="Updated"
            value={formatAppDateTime(loaded.lastUpdateTimeMs) ?? NOT_AVAILABLE}
          />
          <CopyRow label="Installer" value={installer} />
          <CopyRow label="Installer package" value={installerPackage ?? NOT_AVAILABLE} />
          <CopyRow
            label="Debuggable"
            value={analysis == null ? '…' : analysis.debuggable ? 'Yes' : 'No'}
            mono={false}
          />
          <CopyRow
            label="Native ABIs"
            value={
              analysis == null
                ? '…'
                : analysis.abis.length > 0
                  ? analysis.abis.join(', ')
                  : 'No native libraries'
            }
          />
        </View>
      </Card>

      <SectionHeader title="Storage" copyText={storageCopy} />
      <Card>
        <View style={styles.cardBody}>
          {analyzer == null ? (
            <View style={styles.skeleton}>
              <Skeleton height={16} />
              <Skeleton width="70%" height={16} />
            </View>
          ) : analyzer.status !== 'ok' ? (
            <Text style={[styles.caption, { color: colors.muted }]}>
              {analyzer.status === 'unavailable' ? analyzer.reason : 'Permission needed.'}
            </Text>
          ) : hasSizes ? (
            <>
              <CopyRow
                label="App size"
                value={
                  analysis?.appBytes != null ? formatByteSize(analysis.appBytes) : NOT_AVAILABLE
                }
              />
              <CopyRow
                label="Data"
                value={
                  analysis?.dataBytes != null ? formatByteSize(analysis.dataBytes) : NOT_AVAILABLE
                }
              />
              <CopyRow
                label="Cache"
                value={
                  analysis?.cacheBytes != null ? formatByteSize(analysis.cacheBytes) : NOT_AVAILABLE
                }
              />
              <Text style={[styles.caption, { color: colors.muted }]}>
                Android counts the cache inside the data bytes; the cache row breaks it out.
              </Text>
            </>
          ) : (
            <>
              <Text style={[styles.caption, { color: colors.muted }]}>
                Android did not report this app’s size. App sizes need Usage Access; the list and
                details keep working without it.
              </Text>
              <Button
                title="Open Usage Access settings"
                icon="settings"
                variant="secondary"
                onPress={() => open('usage-access')}
              />
            </>
          )}
          {settingsNotice ? (
            <Text style={[styles.caption, { color: colors.muted }]}>{settingsNotice}</Text>
          ) : null}
        </View>
      </Card>

      <SectionHeader title="Signing" copyText={signingCopy} />
      <Card>
        <View style={styles.cardBody}>
          {analyzer == null ? (
            <View style={styles.skeleton}>
              <Skeleton height={16} />
              <Skeleton width="60%" height={16} />
            </View>
          ) : analysis == null ? (
            <Text style={[styles.caption, { color: colors.muted }]}>
              {analyzer.status === 'unavailable' ? analyzer.reason : 'Permission needed.'}
            </Text>
          ) : analysis.signerSha256.length === 0 ? (
            <Text style={[styles.caption, { color: colors.muted }]}>
              Android did not report a signing certificate.
            </Text>
          ) : (
            analysis.signerSha256.map((fingerprint, index) => (
              <CopyRow
                key={fingerprint}
                label={analysis.signerSha256.length > 1 ? `SHA-256 #${index + 1}` : 'SHA-256'}
                value={fingerprint}
                multiline
              />
            ))
          )}
          <Text style={[styles.caption, { color: colors.muted }]}>
            The fingerprint is the SHA-256 of the installed APK’s signing certificate.
          </Text>
        </View>
      </Card>

      <SectionHeader title="Permissions" copyText={permissionsCopy} />
      <Card>
        <View style={styles.cardBody}>
          {analyzer == null ? (
            <View style={styles.skeleton}>
              <Skeleton height={16} />
              <Skeleton width="80%" height={16} />
              <Skeleton width="55%" height={16} />
            </View>
          ) : analysis == null ? (
            <Text style={[styles.caption, { color: colors.muted }]}>
              {analyzer.status === 'unavailable' ? analyzer.reason : 'Permission needed.'}
            </Text>
          ) : permissions.length === 0 ? (
            <Text style={[styles.caption, { color: colors.muted }]}>
              This app declares no permissions.
            </Text>
          ) : (
            <>
              <View style={styles.summaryChips}>
                <Chip label={`Dangerous ${dangerous.length}`} />
                <Chip label={`Normal ${normal.length}`} />
                <Chip label={`Signature ${signature.length}`} />
                {other.length > 0 ? <Chip label={`Other ${other.length}`} /> : null}
              </View>
              <PermissionGroup title="Dangerous" permissions={dangerous} />
              <PermissionGroup title="Normal" permissions={normal} />
              <PermissionGroup title="Signature" permissions={signature} />
              {other.length > 0 ? <PermissionGroup title="Other" permissions={other} /> : null}
            </>
          )}
        </View>
      </Card>

      <SectionHeader title="Components" copyText={componentsCopy} />
      <Card>
        <View style={styles.cardBody}>
          {analyzer == null ? (
            <View style={styles.skeleton}>
              <Skeleton height={16} />
              <Skeleton width="65%" height={16} />
            </View>
          ) : analysis == null ? (
            <Text style={[styles.caption, { color: colors.muted }]}>
              {analyzer.status === 'unavailable' ? analyzer.reason : 'Permission needed.'}
            </Text>
          ) : (
            <>
              <ComponentGroup title="Activities" names={analysis.activities} />
              <ComponentGroup title="Services" names={analysis.services} />
              <ComponentGroup title="Receivers" names={analysis.receivers} />
              <ComponentGroup title="Providers" names={analysis.providers} />
            </>
          )}
        </View>
      </Card>

      <Button title="Open App info" icon="settings" variant="secondary" onPress={openInfo} />
      {apkEnabled ? (
        <>
          <Button
            title="Save a copy of the APK"
            icon="share"
            variant="secondary"
            onPress={apk.start}
            disabled={apk.busy}
          />
          {apk.notice ? (
            <Text style={[styles.caption, { color: colors.muted }]}>{apk.notice}</Text>
          ) : null}
        </>
      ) : null}
      {notice ? <Text style={[styles.notice, { color: colors.muted }]}>{notice}</Text> : null}

      <InfoSheet
        visible={sheetVisible}
        title={APP_SHEET.title}
        paragraphs={APP_SHEET.paragraphs}
        onClose={() => setSheetVisible(false)}
      />
    </Screen>
  );
}

function byPermissionName(a: AnalyzerPermission, b: AnalyzerPermission): number {
  return a.name.localeCompare(b.name);
}

function PermissionGroup({
  title,
  permissions,
}: {
  title: string;
  permissions: AnalyzerPermission[];
}) {
  const { colors } = useTheme();
  if (permissions.length === 0) return null;
  return (
    <View style={styles.group}>
      <Text style={[styles.groupTitle, { color: colors.muted }]}>
        {title} · {permissions.length}
      </Text>
      {permissions.map((permission) => (
        <View key={permission.name} style={styles.permissionRow}>
          <Text numberOfLines={1} style={[styles.permissionName, { color: colors.text }]}>
            {shortPermissionName(permission.name)}
          </Text>
          <Chip
            label={permission.granted ? 'Granted' : 'Not granted'}
            dotColor={permission.granted ? colors.good : colors.critical}
          />
          <CopyButton value={permission.name} label={permission.name} />
        </View>
      ))}
    </View>
  );
}

function ComponentGroup({ title, names }: { title: string; names: string[] }) {
  const { colors } = useTheme();
  const singular = title === 'Activities' ? 'Activity' : title.slice(0, -1);
  return (
    <View style={styles.group}>
      <Text style={[styles.groupTitle, { color: colors.muted }]}>
        {title} · {names.length}
      </Text>
      {names.length === 0 ? (
        <Text style={[styles.caption, { color: colors.muted }]}>None declared.</Text>
      ) : (
        names.map((name) => (
          <View key={name} style={styles.componentRow}>
            <View style={styles.componentText}>
              <Text numberOfLines={1} style={[styles.componentName, { color: colors.text }]}>
                {shortComponentName(name)}
              </Text>
              <Text numberOfLines={1} style={[styles.componentFull, { color: colors.muted }]}>
                {name}
              </Text>
            </View>
            <CopyButton value={name} label={`${singular} ${shortComponentName(name)}`} />
          </View>
        ))
      )}
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
  skeleton: {
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
  caption: {
    ...typography.caption,
  },
  notice: {
    ...typography.caption,
  },
  summaryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  group: {
    gap: spacing.xs,
    paddingTop: spacing.sm,
  },
  groupTitle: {
    ...typography.caption,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 40,
  },
  permissionName: {
    ...typography.mono,
    flex: 1,
  },
  componentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  componentText: {
    flex: 1,
    gap: 1,
  },
  componentName: {
    ...typography.body,
  },
  componentFull: {
    ...typography.caption,
    fontFamily: 'JetBrainsMono_400Regular',
  },
});
