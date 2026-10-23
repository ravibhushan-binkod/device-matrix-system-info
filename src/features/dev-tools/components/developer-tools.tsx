import { useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { testDeviceIdentifiers } from '@/core/ads/config';
import {
  forceEeaConsentTest,
  openAdInspector,
  resetConsent,
  showPrivacyOptions,
} from '@/core/ads/consent';
import { features, isEnabled } from '@/core/features';
import { Button, Card, HeaderIconButton, Screen, SectionHeader } from '@/design-system/components';
import { useTheme } from '@/design-system/theme';
import { spacing, typography } from '@/design-system/tokens';
import { useAdsStore, type AdsStatus } from '@/state/ads-store';
import { DesignGallery } from '@/features/dev-tools/components/design-gallery';
import { SupportMatrixScreen } from '@/features/support-matrix/components/support-matrix-screen';

type ViewName = 'list' | 'gallery' | 'matrix';

const adsStatusLabels: Record<AdsStatus, string> = {
  idle: 'idle',
  running: 'starting…',
  ready: 'ready — banners can load',
  blocked: 'no consent — banners stay hidden',
  error: 'unavailable — banners stay hidden',
  disabled: 'disabled',
};

type Props = {
  visible: boolean;
  onClose: () => void;
};

/**
 * Debug-only tools. This component is rendered from a drawer long-press and
 * has no Expo Router route, so a release build has no developer screen link or
 * route to discover. The __DEV__ guard is repeated here as a second barrier.
 */
export function DeveloperTools({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const adsStatus = useAdsStore((state) => state.status);
  const [view, setView] = useState<ViewName>('list');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  if (!__DEV__) return null;

  const run = async (action: () => Promise<void>, done: string) => {
    setBusy(true);
    setNotice(null);
    try {
      await action();
      setNotice(done);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    setView('list');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          {view === 'list' ? null : (
            <HeaderIconButton
              name="back"
              label="Back to developer tools"
              onPress={() => setView('list')}
            />
          )}
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {view === 'list'
              ? 'Developer tools'
              : view === 'gallery'
                ? 'Component gallery'
                : 'Support matrix'}
          </Text>
          <HeaderIconButton name="x" label="Close developer tools" onPress={close} />
        </View>

        {view === 'gallery' ? (
          <DesignGallery />
        ) : view === 'matrix' ? (
          <SupportMatrixScreen />
        ) : (
          <Screen scroll contentStyle={styles.content}>
            <SectionHeader title="Design" />
            <Card contentStyle={styles.stack}>
              <Button
                title="Open component gallery"
                icon="palette"
                variant="secondary"
                onPress={() => setView('gallery')}
              />
              <Button
                title="Open support matrix"
                icon="search"
                variant="secondary"
                onPress={() => setView('matrix')}
              />
            </Card>

            {isEnabled(features.adDebugTools) ? (
              <>
                <SectionHeader title="Ads" />
                <Card contentStyle={styles.stack}>
                  <Text style={[typography.body, { color: colors.muted }]}>
                    Status: {adsStatusLabels[adsStatus]}. Test ads only — never tap live ads during
                    development.
                  </Text>
                  <Button
                    title="Reset consent"
                    icon="refresh"
                    variant="secondary"
                    disabled={busy}
                    onPress={() =>
                      void run(resetConsent, 'Consent reset. The next ad request asks again.')
                    }
                  />
                  <Button
                    title="Ad Inspector"
                    icon="search"
                    variant="secondary"
                    disabled={busy}
                    onPress={() => void run(openAdInspector, 'Ad Inspector opened.')}
                  />
                  <Button
                    title="Privacy options"
                    icon="shield"
                    variant="secondary"
                    disabled={busy}
                    onPress={() => void run(showPrivacyOptions, 'Privacy options closed.')}
                  />
                  <Button
                    title="Force EEA consent test"
                    icon="info"
                    variant="secondary"
                    disabled={busy}
                    onPress={() =>
                      void run(
                        forceEeaConsentTest,
                        'EEA test geography enabled — the consent form appears for test devices.',
                      )
                    }
                  />
                  {notice ? (
                    <Text style={[typography.caption, { color: colors.muted }]}>{notice}</Text>
                  ) : null}
                </Card>

                <SectionHeader title="Test-device IDs" />
                <Card contentStyle={styles.stack}>
                  <Text selectable style={[typography.mono, { color: colors.text }]}>
                    {testDeviceIdentifiers.join('\n')}
                  </Text>
                  <Text style={[typography.caption, { color: colors.muted }]}>
                    The emulator alias is automatic. Add hashed physical-device IDs through
                    EXPO_PUBLIC_ADMOB_TEST_DEVICE_IDS.
                  </Text>
                </Card>
              </>
            ) : null}
          </Screen>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    ...typography.title,
    flex: 1,
  },
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  stack: {
    gap: spacing.sm,
  },
});
