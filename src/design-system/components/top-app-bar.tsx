import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppLogo } from '@/design-system/components/brand-logo';
import { HeaderIconButton } from '@/design-system/components/header-icon-button';
import { useTheme } from '@/design-system/theme';
import { spacing, typography } from '@/design-system/tokens';

type Props = {
  onOpenDrawer: () => void;
};

/**
 * The single top app bar used by all five tab roots: menu on the left, the
 * one app mark and wordmark in the middle, settings on the right. Detail
 * screens keep the normal navigation header with Back.
 */
export function TopAppBar({ onOpenDrawer }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top,
          backgroundColor: colors.background,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={styles.row}>
        <HeaderIconButton name="menu" label="Open menu" onPress={onOpenDrawer} />
        <View
          accessible
          accessibilityRole="header"
          accessibilityLabel="Device Matrix"
          style={styles.brand}
        >
          <AppLogo size={28} decorative />
          <Text numberOfLines={1} style={[styles.wordmark, { color: colors.text }]}>
            Device Matrix
          </Text>
        </View>
        <HeaderIconButton
          name="settings"
          label="Settings"
          onPress={() => router.push('/settings')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    gap: spacing.xs,
  },
  brand: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  wordmark: {
    ...typography.title,
    flexShrink: 1,
  },
});
