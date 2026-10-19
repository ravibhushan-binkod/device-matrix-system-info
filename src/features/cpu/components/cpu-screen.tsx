import { RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Card, Screen, Skeleton, StatRow } from '@/design-system/components';
import { useTheme } from '@/design-system/theme';
import { spacing, typography } from '@/design-system/tokens';
import { CoreBars } from '@/design-system/visuals';
import { useCpu } from '@/features/cpu/hooks/use-cpu';
import { buildCpuScreenData } from '@/features/cpu/services/cpu-service';
import type { CpuFrequencyBar } from '@/features/cpu/types';

const NOT_AVAILABLE = 'Not available on this device';

/** CPU & GPU: chipset, ABIs, live per-core frequency bars and the GL/Vulkan identity. */
export function CpuScreen() {
  const { colors } = useTheme();
  const { cpu, gpu, refreshing, refresh } = useCpu();
  const data = cpu && gpu ? buildCpuScreenData(cpu, gpu) : null;

  const gpuHasValue =
    data != null &&
    (data.gpuRenderer != null ||
      data.gpuVendor != null ||
      data.glVersion != null ||
      data.glEsVersion != null ||
      data.vulkanVersion != null);

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
      {data ? (
        <>
          <Card>
            <View style={styles.cardBody}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {data.chipset ?? NOT_AVAILABLE}
              </Text>
              <StatRow
                label="Cores"
                value={data.cores == null ? NOT_AVAILABLE : String(data.cores)}
                copyable={false}
              />
              <StatRow
                label="ABIs"
                value={data.abis ?? NOT_AVAILABLE}
                copyable={data.abis != null}
              />
            </View>
          </Card>

          <Card>
            <View style={styles.cardBody}>
              <Text style={[styles.sectionTitle, { color: colors.muted }]}>Per-core frequency</Text>
              {data.bars.length > 0 ? (
                <CoreFrequency bars={data.bars} maxMhz={data.barsMaxMhz} />
              ) : (
                <View style={styles.unavailable}>
                  <Text style={[styles.unavailableTitle, { color: colors.text }]}>
                    {NOT_AVAILABLE}
                  </Text>
                  <Text style={[styles.caption, { color: colors.muted }]}>
                    Per-core frequency readings are blocked on this device.
                  </Text>
                </View>
              )}
            </View>
          </Card>

          <Card>
            <View style={styles.cardBody}>
              <Text style={[styles.sectionTitle, { color: colors.muted }]}>GPU</Text>
              {gpuHasValue ? (
                <>
                  <StatRow
                    label="Renderer"
                    value={data.gpuRenderer ?? NOT_AVAILABLE}
                    copyable={data.gpuRenderer != null}
                  />
                  <StatRow
                    label="Vendor"
                    value={data.gpuVendor ?? NOT_AVAILABLE}
                    copyable={data.gpuVendor != null}
                  />
                  <StatRow
                    label="OpenGL ES"
                    value={data.glEsVersion ?? NOT_AVAILABLE}
                    copyable={data.glEsVersion != null}
                  />
                  <StatRow
                    label="Vulkan"
                    value={data.vulkanVersion ?? NOT_AVAILABLE}
                    copyable={data.vulkanVersion != null}
                  />
                  {data.glVersion ? (
                    <View style={styles.block}>
                      <Text style={[styles.caption, { color: colors.muted }]}>OpenGL</Text>
                      <Text style={[styles.blockValue, { color: colors.text }]}>
                        {data.glVersion}
                      </Text>
                    </View>
                  ) : null}
                </>
              ) : (
                <Text style={[styles.unavailableTitle, { color: colors.text }]}>
                  {NOT_AVAILABLE}
                </Text>
              )}
            </View>
          </Card>
        </>
      ) : (
        <CpuSkeleton />
      )}
    </Screen>
  );
}

function CoreFrequency({ bars, maxMhz }: { bars: CpuFrequencyBar[]; maxMhz: number }) {
  const { colors } = useTheme();

  return (
    <View style={styles.coreGroup}>
      <CoreBars bars={bars} max={maxMhz} accessibilityLabel="CPU core frequency, MHz" />
      <View style={styles.coreValues}>
        {bars.map((bar) => (
          <Text key={bar.label} style={[styles.coreValue, { color: colors.muted }]}>
            C{bar.label} {bar.text}
          </Text>
        ))}
      </View>
      <Text style={[styles.caption, { color: colors.muted }]}>Live · updates every 3 s</Text>
    </View>
  );
}

function CpuSkeleton() {
  return (
    <View style={styles.content}>
      <Card>
        <View style={styles.cardBody}>
          <Skeleton width="60%" height={20} />
          <Skeleton height={16} />
          <Skeleton height={16} />
        </View>
      </Card>
      <Card>
        <View style={styles.cardBody}>
          <Skeleton width="40%" height={14} />
          <Skeleton height={88} />
        </View>
      </Card>
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
  coreGroup: {
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  coreValues: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: spacing.md,
    rowGap: spacing.xs,
  },
  coreValue: {
    ...typography.mono,
  },
  caption: {
    ...typography.caption,
  },
  block: {
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  blockValue: {
    ...typography.mono,
  },
  unavailable: {
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  unavailableTitle: {
    ...typography.body,
  },
});
