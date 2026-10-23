import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { privacyOptionsRequired, showPrivacyOptions } from '@/core/ads/consent';
import { Button, Card, SectionHeader } from '@/design-system/components';
import { useTheme } from '@/design-system/theme';
import { spacing, typography } from '@/design-system/tokens';
import { LegalDocumentScreen } from '@/features/legal/components/legal-document-screen';
import { PRIVACY_POLICY } from '@/features/legal/content';

/**
 * Privacy policy plus the Google consent entry point. "Manage ad choices" is
 * rendered only when Google reports that the privacy-options form is required
 * in this region — never as a permanent duplicate settings row.
 */
export default function PrivacyScreen() {
  const { colors } = useTheme();
  const [required, setRequired] = useState(false);

  useEffect(() => {
    let alive = true;
    privacyOptionsRequired()
      .then((value) => {
        if (alive) setRequired(value);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const openChoices = async () => {
    try {
      await showPrivacyOptions();
    } catch {
      Alert.alert(
        'Could not open ad choices',
        'Google’s consent form is not available right now. Check your connection and try again, or change your advertising ID in Android Settings.',
      );
    }
  };

  return (
    <LegalDocumentScreen
      document={PRIVACY_POLICY}
      footer={
        required ? (
          <View style={styles.footer}>
            <SectionHeader title="Ad choices" />
            <Card contentStyle={styles.card}>
              <Text style={[styles.copy, { color: colors.text }]}>
                Google says a privacy-options choice is required in your region. You can change or
                withdraw your choice at any time.
              </Text>
              <Button title="Manage ad choices" icon="shield" onPress={() => void openChoices()} />
            </Card>
          </View>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  footer: {
    gap: spacing.sm,
  },
  card: {
    gap: spacing.md,
  },
  copy: {
    ...typography.body,
  },
});
