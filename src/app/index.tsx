import Constants from 'expo-constants';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { radius, spacing } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-app-theme';

const plannedSections =
  'Device · OS · CPU/GPU · Memory · Storage · Battery · Thermal · Display · Camera · Sensors · Network & Wi-Fi · Apps · Tips';

export default function HomeScreen() {
  const { colors } = useAppTheme();

  const appVersion = Constants.expoConfig?.version ?? '—';
  const sdkVersion = Constants.expoConfig?.sdkVersion ?? '—';
  const androidApiLevel = String(Platform.Version);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Device Matrix</Text>
          <Text style={[styles.subtitle, { color: colors.accent }]}>System Info</Text>
        </View>

        <View
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Text style={[styles.cardTitle, { color: colors.textMuted }]}>BUILD</Text>
          <InfoRow label="App version" value={appVersion} />
          <InfoRow label="Expo SDK" value={sdkVersion} />
          <InfoRow label="Android API level" value={androidApiLevel} />
        </View>

        <Text style={[styles.planned, { color: colors.textMuted }]}>
          Coming next: {plannedSections}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  header: {
    gap: spacing.xs,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowLabel: {
    fontSize: 14,
    flexShrink: 0,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  planned: {
    fontSize: 13,
    lineHeight: 20,
  },
});
