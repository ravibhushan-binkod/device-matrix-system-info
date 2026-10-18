import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/design-system/components/button';
import { useTheme } from '@/design-system/theme';
import { radius, spacing, typography } from '@/design-system/tokens';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  /** Reassurance shown under the message — usually what keeps working after "no". */
  footer?: string;
  allowLabel?: string;
  cancelLabel?: string;
  onAllow: () => void;
  onCancel: () => void;
};

/**
 * Bottom sheet that explains why a runtime permission is wanted *before* the
 * system dialog appears. Shown only after the user taps an explicit action —
 * never on its own. Reusable for every permission in the app.
 */
export function PermissionRationaleSheet({
  visible,
  title,
  message,
  footer,
  allowLabel = 'Allow',
  cancelLabel = 'Not now',
  onAllow,
  onCancel,
}: Props) {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={styles.root}>
        <Pressable
          style={[styles.backdrop, styles.fill]}
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel="Close the explanation"
        />
        <View
          style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.message, { color: colors.muted }]}>{message}</Text>
          {footer ? <Text style={[styles.footer, { color: colors.muted }]}>{footer}</Text> : null}
          <View style={styles.actions}>
            <Button title={allowLabel} onPress={onAllow} />
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
    backgroundColor: 'rgba(4, 7, 10, 0.6)',
  },
  sheet: {
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.title,
  },
  message: {
    ...typography.body,
  },
  footer: {
    ...typography.caption,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
