import { StyleSheet, Text, View } from 'react-native';

import { Card, Chip, EmptyState, Screen, Skeleton, StatRow } from '@/design-system/components';
import { useTheme } from '@/design-system/theme';
import { spacing, typography } from '@/design-system/tokens';
import { useCamera } from '@/features/camera/hooks/use-camera';
import { buildCameraEntries } from '@/features/camera/services/camera-service';

const NOT_AVAILABLE = 'Not available on this device';

/**
 * Camera: one card per lens from camera2 characteristics. This screen never
 * asks for the camera permission — claiming it would reserve the hardware.
 */
export function CameraScreen() {
  const { colors } = useTheme();
  const { cameras } = useCamera();

  const entries = cameras?.status === 'ok' ? buildCameraEntries(cameras.value) : null;

  return (
    <Screen scroll contentStyle={styles.content}>
      {cameras === null ? (
        <CameraSkeleton />
      ) : entries && entries.length > 0 ? (
        entries.map((entry) => (
          <Card key={entry.key}>
            <View style={styles.cardBody}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{entry.title}</Text>
              {entry.chips.length > 0 ? (
                <View style={styles.chips}>
                  {entry.chips.map((chip) => (
                    <Chip key={chip} label={chip} />
                  ))}
                </View>
              ) : null}
              <View style={styles.specs}>
                {entry.specs.map((spec) => (
                  <StatRow
                    key={spec.key}
                    label={spec.label}
                    value={spec.value ?? NOT_AVAILABLE}
                    copyable={spec.value != null && spec.key === 'id'}
                  />
                ))}
              </View>
            </View>
          </Card>
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
});
