import { StyleSheet, Text, View } from 'react-native';

import type { DeviceIdentity } from '@/core/native';
import type { Result } from '@/core/result';
import { Card } from '@/design-system/components';
import { useTheme } from '@/design-system/theme';
import { spacing, typography } from '@/design-system/tokens';

type Props = {
  identity: Result<DeviceIdentity>;
  /** Formatted uptime, e.g. "15d 14h 26m". */
  uptime: Result<string>;
};

const NOT_AVAILABLE = 'Not available on this device';

function capitalize(text: string): string {
  return text.length === 0 ? text : text.charAt(0).toUpperCase() + text.slice(1);
}

/** Device summary: model, Android version and uptime. */
export function DeviceSummaryCard({ identity, uptime }: Props) {
  const { colors } = useTheme();

  const model =
    identity.status === 'ok'
      ? [capitalize(identity.value.brand), identity.value.model].filter(Boolean).join(' ')
      : null;
  const android =
    identity.status === 'ok'
      ? identity.value.apiLevel != null
        ? `Android ${identity.value.androidVersion} · API ${identity.value.apiLevel}`
        : `Android ${identity.value.androidVersion}`
      : null;
  const up = uptime.status === 'ok' ? `Up ${uptime.value}` : null;

  return (
    <Card>
      <View style={styles.stack}>
        <Text numberOfLines={1} style={[styles.model, { color: colors.text }]}>
          {model || NOT_AVAILABLE}
        </Text>
        <Text numberOfLines={1} style={[styles.line, { color: colors.muted }]}>
          {android ?? NOT_AVAILABLE}
        </Text>
        <Text numberOfLines={1} style={[styles.line, { color: colors.muted }]}>
          {up ?? NOT_AVAILABLE}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.xs,
  },
  model: {
    ...typography.title,
  },
  line: {
    ...typography.caption,
  },
});
