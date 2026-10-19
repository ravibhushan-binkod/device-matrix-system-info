import { StyleSheet, Text, View } from 'react-native';

import type { SystemSettingsTarget } from '@/core/system-settings';
import { Button, Card } from '@/design-system/components';
import { withAlpha } from '@/design-system/color';
import { Icon } from '@/design-system/icon';
import { useTheme } from '@/design-system/theme';
import { radius, spacing, typography } from '@/design-system/tokens';
import { tipColor, tipIcon } from '@/features/tips/components/tip-visuals';
import type { Tip } from '@/features/tips/types';

type Props = {
  tip: Tip;
  onFix: (target: SystemSettingsTarget) => void;
};

/** One finding from the check-up: severity icon, text and the Fix it action. */
export function TipListCard({ tip, onFix }: Props) {
  const { colors } = useTheme();
  const color = tipColor(colors, tip.severity);
  const fix = tip.fix;

  return (
    <Card>
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: withAlpha(color, 0.14) }]}>
          <Icon name={tipIcon(tip.id)} size={20} color={color} />
        </View>
        <View style={styles.headText}>
          <Text style={[styles.title, { color: colors.text }]}>{tip.title}</Text>
          <Text style={[styles.body, { color: colors.muted }]}>{tip.body}</Text>
        </View>
      </View>
      {fix ? <Button title="Fix it" variant="secondary" onPress={() => onFix(fix)} /> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headText: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    ...typography.body,
    fontFamily: 'Inter_600SemiBold',
  },
  body: {
    ...typography.caption,
  },
});
