import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/design-system/components/button';
import { useTheme } from '@/design-system/theme';
import { radius, spacing, typography } from '@/design-system/tokens';

type Props = {
  visible: boolean;
  title?: string;
  message: string;
  openLabel?: string;
  cancelLabel?: string;
  onOpen: () => void;
  onCancel: () => void;
};

/**
 * Centered dialog shown when Android will no longer display a permission
 * dialog ("don't ask again") and the only path left is the app's settings
 * page. Reusable for every permission flow in the app.
 */
export function OpenSettingsDialog({
  visible,
  title = 'Permission needed',
  message,
  openLabel = 'Open settings',
  cancelLabel = 'Not now',
  onOpen,
  onCancel,
}: Props) {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={styles.root}>
        <Pressable
          style={[styles.backdrop, styles.fill]}
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel="Close the dialog"
        />
        <View
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.message, { color: colors.muted }]}>{message}</Text>
          <View style={styles.actions}>
            <Button title={openLabel} icon="settings" onPress={onOpen} />
            <Button title={cancelLabel} variant="ghost" onPress={onCancel} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'stretch',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backdrop: {
    backgroundColor: 'rgba(4, 7, 10, 0.6)',
  },
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: {
    ...typography.title,
  },
  message: {
    ...typography.body,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
