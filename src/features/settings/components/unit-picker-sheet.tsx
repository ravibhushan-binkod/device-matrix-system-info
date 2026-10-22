import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/design-system/animations/pressable-scale';
import { Icon } from '@/design-system/icon';
import { useTheme } from '@/design-system/theme';
import { radius, spacing, typography } from '@/design-system/tokens';
import type { UnitOption } from '@/core/units';

type Props = {
  visible: boolean;
  title: string;
  options: readonly UnitOption[];
  value: string;
  /** e.g. "Celsius" — appended to the System default option in grey. */
  resolvedLabel: string;
  onSelect: (value: string) => void;
  onClose: () => void;
};

/** Bottom sheet with the choices for one unit category. */
export function UnitPickerSheet({
  visible,
  title,
  options,
  value,
  resolvedLabel,
  onSelect,
  onClose,
}: Props) {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Pressable
          style={[styles.backdrop, styles.fill]}
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={onClose}
        />
        <View
          style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <View style={styles.head}>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={8}
              onPress={onClose}
              style={styles.close}
            >
              <Icon name="x" size={20} color={colors.muted} />
            </PressableScale>
          </View>
          <ScrollView contentContainerStyle={styles.list}>
            {options.map((option) => {
              const selected = option.value === value;
              const label =
                option.value === 'system' ? `${option.label} (${resolvedLabel})` : option.label;
              return (
                <PressableScale
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  accessibilityState={{ selected }}
                  onPress={() => {
                    onSelect(option.value);
                    onClose();
                  }}
                  style={[
                    styles.option,
                    {
                      borderColor: selected ? colors.accent : colors.border,
                      backgroundColor: selected ? `${colors.accent}14` : colors.surface2,
                    },
                  ]}
                >
                  <Text style={[styles.optionText, { color: colors.text }]}>{label}</Text>
                  {selected ? <Icon name="check" size={16} color={colors.accent} /> : null}
                </PressableScale>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  sheet: {
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    maxHeight: '75%',
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.title,
  },
  close: {
    padding: spacing.xs,
  },
  list: {
    gap: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  optionText: {
    ...typography.body,
    flexShrink: 1,
  },
});
