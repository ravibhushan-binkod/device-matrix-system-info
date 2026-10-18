import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { Gauge } from 'lucide-react-native';
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
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.surface, colors.background]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <View
              style={[
                styles.badge,
                { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
              ]}
            >
              <Gauge size={24} color={colors.accent} strokeWidth={2} />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: colors.text }]}>Device Matrix</Text>
              <Text style={[styles.subtitle, { color: colors.accent }]}>System Info</Text>
            </View>
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
    </View>
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
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  badge: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    gap: spacing.xs,
  },
  title: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 28,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardTitle: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 11,
    letterSpacing: 1.4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    flexShrink: 0,
  },
  rowValue: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 13,
    flexShrink: 1,
    textAlign: 'right',
  },
  planned: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 20,
  },
});
