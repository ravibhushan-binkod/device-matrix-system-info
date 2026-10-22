import { useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';

import type { DisplayInfo } from '@/core/native';
import type { SystemSettingsTarget } from '@/core/system-settings';
import { formatTimeout } from '@/core/utils/format-duration';
import {
  AdSlot,
  Button,
  Card,
  Chip,
  CopyableText,
  EmptyState,
  InfoSheet,
  Screen,
  SectionHeader,
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
  cutoutLabel,
  diagonalInches,
  formatInches,
  formatRefreshRate,
  formatResolution,
  hdrLabel,
  wideGamutLabel,
} from '@/features/display/services/display-service';

const NOT_AVAILABLE = 'Not available on this device';

const DISPLAY_SHEET = {
  title: 'Display: what this means',
  paragraphs: [
    '"Physical size" is computed from the panel\'s pixel count and the pixels-per-inch the display driver reports (xdpi/ydpi) — it is a diagonal estimate, and some drivers round those numbers.',
    "Refresh modes come from Android's supported-mode list; the current rate is what the display is running at right now. HDR types are the capabilities the panel advertises.",
    '"Wide color gamut" means the panel covers more than sRGB. The cutout row lists the safe-area insets Android reports around the camera hole.',
  ],
};

/** Display: panel details, refresh modes, HDR, brightness and the settings shortcut. */
export function DisplayScreen() {
  const { colors } = useTheme();
  const { info, refreshing, refresh, notice, openSettings } = useDisplay();
  const [sheetVisible, setSheetVisible] = useState(false);

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
          onOpenInfo={() => setSheetVisible(true)}
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

      <InfoSheet
        visible={sheetVisible}
        title={DISPLAY_SHEET.title}
        paragraphs={[...DISPLAY_SHEET.paragraphs]}
        onClose={() => setSheetVisible(false)}
      />
    </Screen>
  );
}

type DetailsProps = {
  colors: AppColors;
  info: DisplayInfo;
  onOpenSettings: (target: SystemSettingsTarget) => void;
  onOpenInfo: () => void;
  notice: string | null;
};

function DisplayDetails({ colors, info, onOpenSettings, onOpenInfo, notice }: DetailsProps) {
  const resolution = formatResolution(info.widthPx, info.heightPx);
  const size = formatInches(diagonalInches(info.widthPx, info.heightPx, info.xdpi, info.ydpi));
  const modes = buildModeRows(info, info.supportedModes.length);
  const hdr = hdrLabel(info.isHdr, info.hdrTypes);
  const wideGamut = wideGamutLabel(info.isWideColorGamut);
  const cutout = cutoutLabel(info.cutout);
  const brightness = brightnessPercent(info.brightness);
  const brightnessMode = brightnessModeLabel(info.brightnessMode);
  const timeout = info.screenTimeoutMs == null ? null : formatTimeout(info.screenTimeoutMs);
  const refresh = formatRefreshRate(info.refreshRateHz);

  const panelCopy = [
    resolution ? `Resolution: ${resolution}` : null,
    size ? `Size: ${size}` : null,
    `Density: ${info.densityDpi} dpi · ${info.density.toFixed(2)}×`,
    wideGamut ? `Colour gamut: ${wideGamut}` : null,
    cutout ? `Cutout: ${cutout}` : null,
  ]
    .filter((line): line is string => line != null)
    .join('\n');
  const refreshCopy = [
    refresh ? `Refresh rate: ${refresh}` : null,
    ...modes.rows.map((mode) => mode.label),
    modes.hiddenCount > 0 ? `+${modes.hiddenCount} more` : null,
  ]
    .filter((line): line is string => line != null)
    .join('\n');
  const brightnessCopy = [
    brightness == null ? null : `Brightness: ${brightness}%`,
    brightnessMode ? `Brightness mode: ${brightnessMode}` : null,
    timeout ? `Screen timeout: ${timeout}` : null,
  ]
    .filter((line): line is string => line != null)
    .join('\n');

  return (
    <View style={styles.sections}>
      <View style={styles.group}>
        <SectionHeader title="Panel" copyText={panelCopy} onInfo={onOpenInfo} />
        <Card>
          <View style={styles.cardBody}>
            <CopyableText
              value={resolution}
              copyLabel="Resolution"
              style={[styles.cardTitle, { color: colors.text }]}
            >
              {resolution ?? NOT_AVAILABLE}
            </CopyableText>
            <StatRow label="Size" value={size ?? NOT_AVAILABLE} />
            <StatRow
              label="Density"
              value={`${info.densityDpi} dpi · ${info.density.toFixed(2)}×`}
            />
            <StatRow label="Color" value={wideGamut ?? NOT_AVAILABLE} />
            <StatRow label="Cutout" value={cutout ?? NOT_AVAILABLE} />
          </View>
        </Card>
      </View>

      <View style={styles.group}>
        <SectionHeader title="Refresh rate" copyText={refreshCopy} onInfo={onOpenInfo} />
        <Card>
          <View style={styles.cardBody}>
            <CopyableText
              value={refresh}
              copyLabel="Refresh rate"
              style={[styles.cardTitle, { color: colors.text }]}
            >
              {refresh ?? NOT_AVAILABLE}
            </CopyableText>
            {modes.rows.length > 0 ? (
              <View style={styles.modeList}>
                <Text style={[styles.caption, { color: colors.muted }]}>Supported modes</Text>
                {modes.rows.map((mode) => (
                  <CopyableText
                    key={mode.key}
                    value={mode.label}
                    copyLabel="Display mode"
                    style={[styles.modeRow, { color: colors.text }]}
                  >
                    {mode.label}
                  </CopyableText>
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
      </View>

      <AdSlot placement="display-mid" />

      <View style={styles.group}>
        <SectionHeader
          title="HDR"
          copyText={hdr == null ? undefined : `HDR: ${hdr}`}
          onInfo={onOpenInfo}
        />
        <Card>
          <View style={styles.cardBody}>
            <CopyableText
              value={hdr}
              copyLabel="HDR"
              style={[styles.cardTitle, { color: colors.text }]}
            >
              {hdr ?? NOT_AVAILABLE}
            </CopyableText>
            {info.hdrTypes.length > 1 ? (
              <View style={styles.chips}>
                {info.hdrTypes.map((type) => (
                  <Chip key={type} label={type} />
                ))}
              </View>
            ) : null}
          </View>
        </Card>
      </View>

      <View style={styles.group}>
        <SectionHeader title="Brightness & timeout" copyText={brightnessCopy} onInfo={onOpenInfo} />
        <Card>
          <View style={styles.cardBody}>
            <StatRow
              label="Brightness"
              value={brightness == null ? NOT_AVAILABLE : `${brightness}%`}
            />
            <StatRow label="Brightness mode" value={brightnessMode ?? NOT_AVAILABLE} />
            <StatRow label="Screen timeout" value={timeout ?? NOT_AVAILABLE} />
          </View>
        </Card>
      </View>

      <View style={styles.actions}>
        <Button
          title="Display settings"
          icon="display"
          variant="secondary"
          onPress={() => onOpenSettings('display')}
        />
        {notice ? <Text style={[styles.caption, { color: colors.muted }]}>{notice}</Text> : null}
      </View>
    </View>
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
  sections: {
    gap: spacing.lg,
  },
  group: {
    gap: spacing.sm,
  },
  cardBody: {
    gap: spacing.sm,
  },
  cardTitle: {
    ...typography.title,
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
