import { useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';

import {
  AdSlot,
  Card,
  Chip,
  InfoSheet,
  Screen,
  SectionHeader,
  Skeleton,
  StatRow,
} from '@/design-system/components';
import { useTheme } from '@/design-system/theme';
import { spacing, typography } from '@/design-system/tokens';
import { CoreBars } from '@/design-system/visuals';
import { formatFrequencyKhz } from '@/core/utils/format-frequency';
import { useCpu } from '@/features/cpu/hooks/use-cpu';
import { buildCpuScreenData } from '@/features/cpu/services/cpu-service';
import type { CpuCluster, CpuCoreRow } from '@/features/cpu/types';

const NOT_AVAILABLE = 'Not available on this device';

const SHEETS = {
  cpu: {
    title: 'CPU: what this means',
    paragraphs: [
      'Clusters group the cores by their highest frequency: little cores save power, big cores deliver peak speed, and mid cores sit between. The bars and the values below show each core’s live frequency, updated every few seconds.',
      'Frequency limits and the governor (the kernel’s frequency policy, for example "schedutil") are read from the device’s own cpufreq files. Brands that block those reads show "Not available on this device" — nothing is estimated.',
    ],
  },
  gpu: {
    title: 'GPU: what this means',
    paragraphs: [
      'Renderer and vendor are the graphics driver’s own identity strings. OpenGL ES is the API most games use; Vulkan is the newer, lower-overhead one — its hardware level and compute support come from Android’s system features.',
      'Everything here is reported by the driver and Android, not measured or benchmarked.',
    ],
  },
} as const;

/** CPU & GPU: chipset, ABIs, clusters, live per-core frequency and the GL/Vulkan identity. */
export function CpuScreen() {
  const { colors } = useTheme();
  const { cpu, gpu, refreshing, refresh } = useCpu();
  const [sheet, setSheet] = useState<keyof typeof SHEETS | null>(null);
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
          <View style={styles.group}>
            <SectionHeader title="Chipset" onInfo={() => setSheet('cpu')} />
            <Card>
              <View style={styles.cardBody}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>
                  {data.chipset ?? NOT_AVAILABLE}
                </Text>
                {data.socManufacturer ? (
                  <StatRow label="Manufacturer" value={data.socManufacturer} />
                ) : null}
                {data.socModel ? <StatRow label="Model" value={data.socModel} /> : null}
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
                <StatRow
                  label="Governor"
                  value={data.governor ?? NOT_AVAILABLE}
                  copyable={data.governor != null}
                />
              </View>
            </Card>
          </View>

          <AdSlot placement="cpu-mid" />

          <View style={styles.group}>
            <SectionHeader title="Clusters & cores" />
            <Card>
              <View style={styles.cardBody}>
                {data.bars.length > 0 ? (
                  <View style={styles.coreGroup}>
                    <CoreBars
                      bars={data.bars}
                      max={data.barsMaxMhz}
                      accessibilityLabel="CPU core frequency, MHz"
                    />
                    <Text style={[styles.caption, { color: colors.muted }]}>
                      Live · updates every 3 s
                    </Text>
                  </View>
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
                {data.clusters.length > 0 ? (
                  <ClusterList clusters={data.clusters} rows={data.coreRows} />
                ) : null}
              </View>
            </Card>
          </View>

          <View style={styles.group}>
            <SectionHeader title="GPU" onInfo={() => setSheet('gpu')} />
            <Card>
              <View style={styles.cardBody}>
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
                    <StatRow
                      label="Vulkan level"
                      value={
                        data.vulkanLevel == null ? NOT_AVAILABLE : `Level ${data.vulkanLevel}`
                      }
                      copyable={false}
                    />
                    <StatRow
                      label="Vulkan compute"
                      value={
                        data.vulkanCompute == null
                          ? NOT_AVAILABLE
                          : data.vulkanCompute
                            ? 'Supported'
                            : 'Not supported'
                      }
                      copyable={false}
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
          </View>
        </>
      ) : (
        <CpuSkeleton />
      )}

      <InfoSheet
        visible={sheet != null}
        title={sheet ? SHEETS[sheet].title : ''}
        paragraphs={sheet ? [...SHEETS[sheet].paragraphs] : []}
        onClose={() => setSheet(null)}
      />
    </Screen>
  );
}

/** One line per core: live frequency · range · governor. */
function coreRowText(row: CpuCoreRow): string {
  const parts = [row.current, row.range, row.governor].filter(
    (part): part is string => part != null,
  );
  return parts.length > 0
    ? `${row.core} · ${parts.join(' · ')}`
    : `${row.core} · ${NOT_AVAILABLE}`;
}

function ClusterList({ clusters, rows }: { clusters: CpuCluster[]; rows: CpuCoreRow[] }) {
  const { colors } = useTheme();

  return (
    <View style={styles.clusters}>
      {clusters.map((cluster) => {
        const clusterRows = rows.filter((row) => cluster.cores.includes(Number(row.key)));
        const maxText = cluster.maxKhz != null ? formatFrequencyKhz(cluster.maxKhz) : null;
        return (
          <View key={cluster.key} style={styles.cluster}>
            <View style={styles.clusterHeader}>
              <Chip label={cluster.label} />
              <Text style={[styles.caption, { color: colors.muted }]}>
                {cluster.cores.length === 1 ? '1 core' : `${cluster.cores.length} cores`}
                {maxText ? ` · up to ${maxText}` : ''}
              </Text>
            </View>
            {clusterRows.map((row) => (
              <Text key={row.key} style={[styles.coreValue, { color: colors.muted }]}>
                {coreRowText(row)}
              </Text>
            ))}
          </View>
        );
      })}
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
  group: {
    gap: spacing.sm,
  },
  cardBody: {
    gap: spacing.sm,
  },
  cardTitle: {
    ...typography.title,
  },
  coreGroup: {
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  clusters: {
    gap: spacing.lg,
    paddingTop: spacing.md,
  },
  cluster: {
    gap: spacing.xs,
  },
  clusterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
