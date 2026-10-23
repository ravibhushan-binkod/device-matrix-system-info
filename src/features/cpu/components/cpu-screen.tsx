import { useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';

import {
  AdSlot,
  DeviceBrandLogo,
  Card,
  Chip,
  CopyableText,
  InfoSheet,
  Screen,
  SectionHeader,
  Skeleton,
  StatRow,
} from '@/design-system/components';
import { useTheme } from '@/design-system/theme';
import { spacing, typography } from '@/design-system/tokens';
import { CoreBars } from '@/design-system/visuals';
import {
  detectGpuBrand,
  detectSocBrand,
  type BrandMark,
  type BrandInput,
} from '@/core/brand/detect-brand';
import { formatFrequencyKhz, useFormatters, type ResolvedUnits } from '@/core/units';
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
  const formatters = useFormatters();
  const { cpu, gpu, refreshing, refresh } = useCpu();
  const [sheet, setSheet] = useState<keyof typeof SHEETS | null>(null);
  const data = cpu && gpu ? buildCpuScreenData(cpu, gpu, formatters.units) : null;

  const brandInput: BrandInput = {
    manufacturer: null,
    brand: null,
    socManufacturer: data?.socManufacturer ?? null,
    socModel: data?.socModel ?? null,
    hardware: data?.hardware ?? null,
    gpuRenderer: data?.gpuRenderer ?? null,
    gpuVendor: data?.gpuVendor ?? null,
    androidVersion: null,
  };
  const socMark: BrandMark | null = data
    ? detectSocBrand({ ...brandInput, chipset: data.chipset })
    : null;
  const gpuMark: BrandMark | null = data ? detectGpuBrand(brandInput) : null;

  const gpuHasValue =
    data != null &&
    (data.gpuRenderer != null ||
      data.gpuVendor != null ||
      data.glVersion != null ||
      data.glEsVersion != null ||
      data.vulkanVersion != null);

  const chipsetCopy = data
    ? [
        data.chipset ? `Chipset: ${data.chipset}` : null,
        data.socManufacturer ? `Manufacturer: ${data.socManufacturer}` : null,
        data.socModel ? `Model: ${data.socModel}` : null,
        data.cores == null ? null : `Cores: ${data.cores}`,
        data.abis ? `ABIs: ${data.abis}` : null,
        data.governor ? `Governor: ${data.governor}` : null,
      ]
        .filter((line): line is string => line != null)
        .join('\n')
    : undefined;
  const coresCopy =
    data && data.coreRows.length > 0
      ? data.coreRows.map((row) => coreRowText(row)).join('\n')
      : undefined;
  const gpuCopy = data
    ? [
        data.gpuRenderer ? `Renderer: ${data.gpuRenderer}` : null,
        data.gpuVendor ? `Vendor: ${data.gpuVendor}` : null,
        data.glVersion ? `OpenGL: ${data.glVersion}` : null,
        data.glEsVersion ? `OpenGL ES: ${data.glEsVersion}` : null,
        data.vulkanVersion ? `Vulkan: ${data.vulkanVersion}` : null,
        data.vulkanLevel == null ? null : `Vulkan level: ${data.vulkanLevel}`,
        data.vulkanCompute == null
          ? null
          : `Vulkan compute: ${data.vulkanCompute ? 'Supported' : 'Not supported'}`,
      ]
        .filter((line): line is string => line != null)
        .join('\n')
    : undefined;

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
            <SectionHeader title="Chipset" copyText={chipsetCopy} onInfo={() => setSheet('cpu')} />
            <Card>
              <View style={styles.cardBody}>
                <View style={styles.brandTitleRow}>
                  <DeviceBrandLogo mark={socMark} size={26} color={colors.accent} />
                  <CopyableText
                    value={data.chipset}
                    copyLabel="Chipset"
                    style={[styles.cardTitle, styles.brandTitle, { color: colors.text }]}
                  >
                    {data.chipset ?? NOT_AVAILABLE}
                  </CopyableText>
                </View>
                {data.socManufacturer ? (
                  <StatRow label="Manufacturer" value={data.socManufacturer} />
                ) : null}
                {data.socModel ? <StatRow label="Model" value={data.socModel} /> : null}
                <StatRow
                  label="Cores"
                  value={data.cores == null ? NOT_AVAILABLE : String(data.cores)}
                />
                <StatRow label="ABIs" value={data.abis ?? NOT_AVAILABLE} />
                <StatRow label="Governor" value={data.governor ?? NOT_AVAILABLE} />
              </View>
            </Card>
          </View>

          <AdSlot placement="cpu-mid" />

          <View style={styles.group}>
            <SectionHeader title="Clusters & cores" copyText={coresCopy} />
            <Card>
              <View style={styles.cardBody}>
                {data.bars.length > 0 ? (
                  <View style={styles.coreGroup}>
                    <CoreBars
                      bars={data.bars}
                      max={data.barsMax}
                      accessibilityLabel={`CPU core frequency, ${data.barsUnit}`}
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
                  <ClusterList
                    clusters={data.clusters}
                    rows={data.coreRows}
                    units={formatters.units}
                  />
                ) : null}
              </View>
            </Card>
          </View>

          <View style={styles.group}>
            <SectionHeader title="GPU" copyText={gpuCopy} onInfo={() => setSheet('gpu')} />
            <Card>
              <View style={styles.cardBody}>
                {gpuHasValue ? (
                  <>
                    {gpuMark ? (
                      <View style={styles.brandTitleRow}>
                        <DeviceBrandLogo mark={gpuMark} size={22} color={colors.violet} />
                        <Text style={[styles.caption, { color: colors.muted, flexShrink: 1 }]}>
                          {gpuMark.name}
                        </Text>
                      </View>
                    ) : null}
                    <StatRow label="Renderer" value={data.gpuRenderer ?? NOT_AVAILABLE} />
                    <StatRow label="Vendor" value={data.gpuVendor ?? NOT_AVAILABLE} />
                    <StatRow label="OpenGL ES" value={data.glEsVersion ?? NOT_AVAILABLE} />
                    <StatRow label="Vulkan" value={data.vulkanVersion ?? NOT_AVAILABLE} />
                    <StatRow
                      label="Vulkan level"
                      value={data.vulkanLevel == null ? NOT_AVAILABLE : `Level ${data.vulkanLevel}`}
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
                    />
                    {data.glVersion ? (
                      <View style={styles.block}>
                        <Text style={[styles.caption, { color: colors.muted }]}>OpenGL</Text>
                        <CopyableText
                          value={data.glVersion}
                          copyLabel="OpenGL version"
                          style={[styles.blockValue, { color: colors.text }]}
                        >
                          {data.glVersion}
                        </CopyableText>
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
  return parts.length > 0 ? `${row.core} · ${parts.join(' · ')}` : `${row.core} · ${NOT_AVAILABLE}`;
}

function ClusterList({
  clusters,
  rows,
  units,
}: {
  clusters: CpuCluster[];
  rows: CpuCoreRow[];
  units: ResolvedUnits;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.clusters}>
      {clusters.map((cluster) => {
        const clusterRows = rows.filter((row) => cluster.cores.includes(Number(row.key)));
        const maxText =
          cluster.maxKhz != null ? formatFrequencyKhz(cluster.maxKhz, units.frequency) : null;
        return (
          <View key={cluster.key} style={styles.cluster}>
            <View style={styles.clusterHeader}>
              <Chip label={cluster.label} />
              <Text style={[styles.caption, { color: colors.muted }]}>
                {cluster.cores.length === 1 ? '1 core' : `${cluster.cores.length} cores`}
                {maxText ? ` · up to ${maxText}` : ''}
              </Text>
            </View>
            {clusterRows.map((row) => {
              const text = coreRowText(row);
              return (
                <CopyableText
                  key={row.key}
                  value={text}
                  copyLabel={row.core}
                  style={[styles.coreValue, { color: colors.muted }]}
                >
                  {text}
                </CopyableText>
              );
            })}
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
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  brandTitle: {
    flexShrink: 1,
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
