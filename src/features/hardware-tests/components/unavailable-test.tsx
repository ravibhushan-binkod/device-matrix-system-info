import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/design-system/components';
import { withAlpha } from '@/design-system/color';
import { Icon } from '@/design-system/icon';
import { useTheme } from '@/design-system/theme';
import { spacing, typography } from '@/design-system/tokens';
import type { HardwareTestDefinition } from '@/features/hardware-tests/types';

/** Body for optional/off or skipped tests. The shell owns the reason card too. */
export function UnavailableTest({ definition }: { definition: HardwareTestDefinition }) {
  const { colors } = useTheme();
  const off = definition.availability === 'off';

  return (
    <Card style={styles.card}>
      <View style={[styles.badge, { backgroundColor: withAlpha(colors.muted, 0.12) }]}>
        <Icon name="minus" size={40} color={colors.muted} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>
        {off ? 'Not enabled in this build' : 'Skipped on this device'}
      </Text>
      <Text style={[styles.message, { color: colors.muted }]}>
        {definition.unavailableReason ??
          (off
            ? 'This check is behind a feature flag that is off.'
            : 'Android does not give normal apps a safe way to run this check.')}
      </Text>
      <Text style={[styles.note, { color: colors.muted }]}>
        Nothing is requested, installed or changed to make this test available.
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xl,
  },
  badge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.title,
    textAlign: 'center',
  },
  message: {
    ...typography.body,
    textAlign: 'center',
    lineHeight: 21,
  },
  note: {
    ...typography.caption,
    textAlign: 'center',
    lineHeight: 18,
  },
});
