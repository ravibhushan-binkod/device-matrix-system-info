import { StyleSheet, Text, View } from 'react-native';

import type { SystemSettingsTarget } from '@/core/system-settings';
import { PressableScale } from '@/design-system/animations/pressable-scale';
import { Card } from '@/design-system/components';
import { Icon, type IconName } from '@/design-system/icon';
import { useTheme } from '@/design-system/theme';
import { spacing, typography } from '@/design-system/tokens';

type Action = { target: SystemSettingsTarget; label: string; icon: IconName };

const ACTIONS: readonly Action[] = [
  { target: 'storage', label: 'Free up space', icon: 'storage' },
  { target: 'battery-saver', label: 'Battery settings', icon: 'battery' },
  { target: 'wifi', label: 'Wi-Fi', icon: 'wifi' },
  { target: 'alarm', label: 'Set alarm', icon: 'alarm' },
];

type Props = {
  /** Launches the matching system screen; failures surface as a notice. */
  onAction: (target: SystemSettingsTarget) => void;
};

/**
 * Quick actions row — each one opens the matching system Settings screen
 * (Android does not let apps change these directly, so the app hands over).
 */
export function QuickActions({ onAction }: Props) {
  const { colors } = useTheme();

  return (
    <Card>
      <View style={styles.row}>
        {ACTIONS.map((action) => (
          <PressableScale
            key={action.target}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            onPress={() => onAction(action.target)}
            style={styles.tile}
          >
            <Icon name={action.icon} size={24} color={colors.accent} />
            <Text numberOfLines={2} style={[styles.label, { color: colors.text }]}>
              {action.label}
            </Text>
          </PressableScale>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tile: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  label: {
    ...typography.caption,
    textAlign: 'center',
    height: 32,
  },
});
