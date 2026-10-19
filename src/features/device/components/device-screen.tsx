import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Fragment, useEffect, useRef, useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';

import { AdSlot, Button, Card, Screen, Skeleton, StatRow } from '@/design-system/components';
import { useTheme } from '@/design-system/theme';
import { spacing, typography } from '@/design-system/tokens';
import { useDevice } from '@/features/device/hooks/use-device';
import type { DeviceInfoEntry, DeviceInfoSection } from '@/features/device/types';

const NOT_AVAILABLE = 'Not available on this device';

/** Device & OS: identity, OS details and kernel/build values with a "Copy all" report. */
export function DeviceScreen() {
  const { colors } = useTheme();
  const { info, refreshing, refresh } = useDevice();

  return (
    <Screen
      scroll
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
          colors={[colors.accent]}
          progressBackgroundColor={colors.surface2}
          tintColor={colors.accent}
        />
      }
      contentStyle={styles.content}
    >
      {info ? (
        <>
          {info.sections.map((section, index) => (
            <Fragment key={section.key}>
              {index === 2 ? <AdSlot placement="device-sections" /> : null}
              <SectionCard section={section} />
            </Fragment>
          ))}
          <CopyAllButton report={info.report} />
        </>
      ) : (
        <DeviceSkeleton />
      )}
    </Screen>
  );
}

function SectionCard({ section }: { section: DeviceInfoSection }) {
  const { colors } = useTheme();

  return (
    <Card>
      <View style={styles.cardBody}>
        <Text style={[styles.sectionTitle, { color: colors.muted }]}>{section.title}</Text>
        {section.entries.map((entry) =>
          entry.multiline ? (
            <BlockRow key={entry.key} entry={entry} />
          ) : (
            <StatRow
              key={entry.key}
              label={entry.label}
              value={entry.value ?? NOT_AVAILABLE}
              copyable={entry.value != null}
            />
          ),
        )}
      </View>
    </Card>
  );
}

function BlockRow({ entry }: { entry: DeviceInfoEntry }) {
  const { colors } = useTheme();

  return (
    <View style={styles.block}>
      <Text style={[styles.blockLabel, { color: colors.muted }]}>{entry.label}</Text>
      <Text style={[styles.blockValue, { color: entry.value ? colors.text : colors.muted }]}>
        {entry.value ?? NOT_AVAILABLE}
      </Text>
    </View>
  );
}

function CopyAllButton({ report }: { report: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const onPress = () => {
    Clipboard.setStringAsync(report)
      .then(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        setCopied(true);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  };

  return (
    <Button
      title={copied ? 'Copied' : 'Copy all'}
      icon={copied ? 'check' : 'copy'}
      onPress={onPress}
    />
  );
}

function DeviceSkeleton() {
  return (
    <View style={styles.skeletonStack}>
      {[0, 1, 2].map((card) => (
        <Card key={card}>
          <View style={styles.cardBody}>
            <Skeleton width="35%" height={14} />
            {[0, 1, 2, 3].map((row) => (
              <Skeleton key={row} height={16} />
            ))}
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
  sectionTitle: {
    ...typography.caption,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  block: {
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  blockLabel: {
    ...typography.caption,
  },
  blockValue: {
    ...typography.mono,
  },
  skeletonStack: {
    gap: spacing.lg,
  },
});
