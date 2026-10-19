import { RefreshControl, StyleSheet, Text, View } from 'react-native';

import type { DisplayInfo } from '@/core/native';
import type { SystemSettingsTarget } from '@/core/system-settings';
import { formatTimeout } from '@/core/utils/format-duration';
import {
  AdSlot,
  Button,
  Card,
  Chip,
  EmptyState,
  Screen,
  Skeleton,
  StatRow,
} from '@/design-system/components';
import { useTheme } from '@/design-system/theme';
import type { AppColors } from '@/design-system/tokens';
import { spacing, typography } from '@/design-system/tokens';
import { useDisplay } from '@/features/display/hooks/use-display';
import {
  brightnessModeLabel,
  brightnessPercent,
  buildModeRows,
  diagonalInches,
  formatInches,
  formatRefreshRate,
  formatResolution,
  hdrLabel,
} from '@/features/display/services/display-service';

const NOT_AVAILABLE = 'Not available on this device';

/** Display: panel details, refresh modes, HDR, brightness and the settings shortcut. */
export function DisplayScreen() {
  const { colors } = useTheme();
  const { info, refreshing, refresh, notice, openSettings } = useDisplay();

  return (
    <Screen
      scroll
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
          colors={[colors.accent]}
          progressBackgroundColor={colors.surface2}
          tintColor={colors.accent}
        />
      }
      contentStyle={styles.content}
    >
      {info === null ? (
        <DisplaySkeleton />
      ) : info.status === 'ok' ? (
        <DisplayDetails
          colors={colors}
          info={info.value}
          onOpenSettings={openSettings}
          notice={notice}
        />
      ) : (
        <EmptyState
          icon="display"
          title="Display"
          message={
            info.status === 'unavailable' ? info.reason : `Permission needed: ${info.permission}`
          }
        />
      )}
    </Screen>
  );
}

type DetailsProps = {
  colors: AppColors;
  info: DisplayInfo;
  onOpenSettings: (target: SystemSettingsTarget) => void;
  notice: string | null;
};

function DisplayDetails({ colors, info, onOpenSettings, notice }: DetailsProps) {
  const resolution = formatResolution(info.widthPx, info.heightPx);
  const size = formatInches(diagonalInches(info.widthPx, info.heightPx, info.xdpi, info.ydpi));
  const modes = buildModeRows(info);
  const hdr = hdrLabel(info.isHdr, info.hdrTypes);
  const brightness = brightnessPercent(info.brightness);
  const brightnessMode = brightnessModeLabel(info.brightnessMode);
  const timeout = info.screenTimeoutMs == null ? null : formatTimeout(info.screenTimeoutMs);

  return (
    <>
      <Card>
        <View style={styles.cardBody}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>Panel</Text>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            {resolution ?? NOT_AVAILABLE}
          </Text>
          <StatRow label="Size" value={size ?? NOT_AVAILABLE} copyable={false} />
          <StatRow
            label="Density"
            value={`${info.densityDpi} dpi · ${info.density.toFixed(2)}×`}
            copyable={false}
          />
        </View>
      </Card>

      <Card>
        <View style={styles.cardBody}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>Refresh rate</Text>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            {formatRefreshRate(info.refreshRateHz) ?? NOT_AVAILABLE}
          </Text>
          {modes.rows.length > 0 ? (
            <View style={styles.modeList}>
              <Text style={[styles.caption, { color: colors.muted }]}>Supported modes</Text>
              {modes.rows.map((mode) => (
                <Text key={mode.key} style={[styles.modeRow, { color: colors.text }]}>
                  {mode.label}
                </Text>
              ))}
              {modes.hiddenCount > 0 ? (
                <Text style={[styles.caption, { color: colors.muted }]}>
                  +{modes.hiddenCount} more
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>
      </Card>

      <AdSlot placement="display-mid" />

      <Card>
        <View style={styles.cardBody}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>HDR</Text>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{hdr ?? NOT_AVAILABLE}</Text>
          {info.hdrTypes.length > 1 ? (
            <View style={styles.chips}>
              {info.hdrTypes.map((type) => (
                <Chip key={type} label={type} />
              ))}
            </View>
          ) : null}
        </View>
      </Card>

      <Card>
        <View style={styles.cardBody}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>Brightness & timeout</Text>
          <StatRow
            label="Brightness"
            value={brightness == null ? NOT_AVAILABLE : `${brightness}%`}
            copyable={false}
          />
          <StatRow
            label="Brightness mode"
            value={brightnessMode ?? NOT_AVAILABLE}
            copyable={false}
          />
          <StatRow label="Screen timeout" value={timeout ?? NOT_AVAILABLE} copyable={false} />
        </View>
      </Card>

      <View style={styles.actions}>
        <Button
          title="Display settings"
          icon="display"
          variant="secondary"
          onPress={() => onOpenSettings('display')}
        />
        {notice ? <Text style={[styles.caption, { color: colors.muted }]}>{notice}</Text> : null}
      </View>
    </>
  );
}

function DisplaySkeleton() {
  return (
    <View style={styles.content}>
      {[0, 1, 2].map((card) => (
        <Card key={card}>
          <View style={styles.cardBody}>
            <Skeleton width="40%" height={14} />
            <Skeleton width="70%" height={20} />
            <Skeleton height={16} />
          </View>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  cardBody: {
    gap: spacing.sm,
  },
  cardTitle: {
    ...typography.title,
  },
  sectionTitle: {
    ...typography.caption,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  caption: {
    ...typography.caption,
  },
  modeList: {
    gap: spacing.xs,
    paddingTop: spacing.sm,
  },
  modeRow: {
    ...typography.mono,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  actions: {
    gap: spacing.sm,
  },
});
