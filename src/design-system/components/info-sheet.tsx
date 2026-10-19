import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/design-system/components/button';
import { useTheme } from '@/design-system/theme';
import { radius, spacing, typography } from '@/design-system/tokens';

type Props = {
  visible: boolean;
  title: string;
  /** One or two plain sentences each; keep them short and honest. */
  paragraphs: string[];
  onClose: () => void;
};

/**
 * Bottom sheet that explains what a section's readings mean, in plain words.
 * Opened from a section's info button — never on its own. Reusable for every
 * screen in the app.
 */
export function InfoSheet({ visible, title, paragraphs, onClose }: Props) {
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
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close the explanation"
        />
        <View
          style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} bounces={false}>
            {paragraphs.map((paragraph, index) => (
              <Text key={index} style={[styles.paragraph, { color: colors.muted }]}>
                {paragraph}
              </Text>
            ))}
          </ScrollView>
          <View style={styles.actions}>
            <Button title="Got it" onPress={onClose} />
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
    maxHeight: '78%',
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
  body: {
    flexGrow: 0,
  },
  bodyContent: {
    gap: spacing.md,
  },
  paragraph: {
    ...typography.body,
  },
  actions: {
    marginTop: spacing.sm,
  },
});
