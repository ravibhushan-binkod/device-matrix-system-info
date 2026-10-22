import { Fragment, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  AdSlot,
  Card,
  Chip,
  CopyableText,
  EmptyState,
  InfoSheet,
  Screen,
  SectionHeader,
  Skeleton,
  StatRow,
} from '@/design-system/components';
import { copyValue } from '@/design-system/copy/copy-value';
import { useTheme } from '@/design-system/theme';
import { spacing, typography } from '@/design-system/tokens';
import { useCamera } from '@/features/camera/hooks/use-camera';
import { buildCameraEntries } from '@/features/camera/services/camera-service';

const NOT_AVAILABLE = 'Not available on this device';

const CAMERA_SHEET = {
  title: 'Camera: what this means',
  paragraphs: [
    'Every row comes from Android\'s camera2 characteristics — the same data the system camera app reads. When a brand hides a value, the row says "Not available on this device"; nothing is guessed.',
    'Several lenses can sit behind one logical camera, and Android 9+ lists them under "Physical lenses". "Max resolution" is the largest JPEG the camera reports, and megapixels come from that number.',
    'The 35 mm equivalent is computed from the lens focal length and the physical sensor size (a full-frame sensor is 43.27 mm diagonally). "Min focus" comes from the lens dioptre value — 0 dioptres means fixed focus.',
    'Device Matrix never asks for the camera permission, so this screen only reports capabilities — it cannot take pictures.',
  ],
};

/**
 * Camera: one card per lens from camera2 characteristics. This screen never
 * asks for the camera permission — claiming it would reserve the hardware.
 */
export function CameraScreen() {
  const { colors } = useTheme();
  const { cameras } = useCamera();
  const [sheetVisible, setSheetVisible] = useState(false);

  const entries = cameras?.status === 'ok' ? buildCameraEntries(cameras.value) : null;
  const camerasCopy =
    entries && entries.length > 0
      ? entries
          .map((entry) =>
            [
              entry.title,
              ...entry.chips,
              ...entry.specs.map((spec) => `${spec.label}: ${spec.value ?? NOT_AVAILABLE}`),
            ].join('\n'),
          )
          .join('\n\n')
      : undefined;

  return (
    <Screen scroll contentStyle={styles.content}>
      <SectionHeader
        title="Cameras & lenses"
        copyText={camerasCopy}
        onInfo={() => setSheetVisible(true)}
      />

      {cameras === null ? (
        <CameraSkeleton />
      ) : entries && entries.length > 0 ? (
        entries.map((entry, index) => (
          <Fragment key={entry.key}>
            <Card>
              <View style={styles.cardBody}>
                <CopyableText
                  value={entry.title}
                  copyLabel="Camera"
                  style={[styles.cardTitle, { color: colors.text }]}
                >
                  {entry.title}
                </CopyableText>
                {entry.chips.length > 0 ? (
                  <View style={styles.chips}>
                    {entry.chips.map((chip) => (
                      <Chip
                        key={chip}
                        label={chip}
                        onLongPress={() => void copyValue(chip, entry.title)}
                      />
                    ))}
                  </View>
                ) : null}
                <View style={styles.specs}>
                  {entry.specs.map((spec) =>
                    spec.multiline ? (
                      <View key={spec.key} style={styles.block}>
                        <Text style={[styles.blockLabel, { color: colors.muted }]}>
                          {spec.label}
                        </Text>
                        <CopyableText
                          value={spec.value}
                          copyLabel={spec.label}
                          style={[
                            styles.blockValue,
                            { color: spec.value ? colors.text : colors.muted },
                          ]}
                        >
                          {spec.value ?? NOT_AVAILABLE}
                        </CopyableText>
                      </View>
                    ) : (
                      <StatRow
                        key={spec.key}
                        label={spec.label}
                        value={spec.value ?? NOT_AVAILABLE}
                      />
                    ),
                  )}
                </View>
              </View>
            </Card>
            {index === 0 ? <AdSlot placement="camera-lens" /> : null}
          </Fragment>
        ))
      ) : (
        <EmptyState
          icon="camera"
          title="Camera"
          message={
            cameras.status === 'unavailable'
              ? cameras.reason
              : cameras.status === 'denied'
                ? `Permission needed: ${cameras.permission}`
                : 'Android did not report any cameras on this device.'
          }
        />
      )}

      <InfoSheet
        visible={sheetVisible}
        title={CAMERA_SHEET.title}
        paragraphs={[...CAMERA_SHEET.paragraphs]}
        onClose={() => setSheetVisible(false)}
      />
    </Screen>
  );
}

function CameraSkeleton() {
  return (
    <View style={styles.content}>
      {[0, 1].map((card) => (
        <Card key={card}>
          <View style={styles.cardBody}>
            <Skeleton width="45%" height={20} />
            <Skeleton width="70%" height={28} />
            <Skeleton height={16} />
            <Skeleton height={16} />
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
  cardTitle: {
    ...typography.title,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  specs: {
    gap: spacing.xs,
    paddingTop: spacing.sm,
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
});
