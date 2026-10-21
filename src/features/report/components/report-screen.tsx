import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/design-system/animations/pressable-scale';
import { Button, Card, Chip, Screen, SectionHeader } from '@/design-system/components';
import { Icon } from '@/design-system/icon';
import { useTheme } from '@/design-system/theme';
import { radius, spacing, typography } from '@/design-system/tokens';
import { useReport } from '@/features/report/hooks/use-report';
import { REPORT_GROUPS } from '@/features/report/services/report-service';

/** The report composer: pick sections, preview, then copy, share or export. */
export function ReportScreen() {
  const { colors } = useTheme();
  const {
    selected,
    toggle,
    selectAll,
    clearAll,
    preview,
    buildPreview,
    copy,
    share,
    savePdf,
    pdfEnabled,
    notice,
    busy,
  } = useReport();
  const canExport = preview !== null && busy === null;
  const pickingDisabled = busy !== null;

  return (
    <Screen scroll contentStyle={styles.content}>
      <SectionHeader
        title="Sections"
        action={
          <Text style={[styles.count, { color: colors.muted }]}>
            {selected.size} of {REPORT_GROUPS.length}
          </Text>
        }
      />
      <View style={styles.toolbar}>
        <Chip label="Select all" onPress={selectAll} />
        <Chip label="Clear" onPress={clearAll} />
      </View>

      <Card contentStyle={styles.list}>
        {REPORT_GROUPS.map((group) => {
          const checked = selected.has(group.id);
          return (
            <PressableScale
              key={group.id}
              onPress={() => toggle(group.id)}
              disabled={pickingDisabled}
              accessibilityRole="checkbox"
              accessibilityState={{ checked, disabled: pickingDisabled }}
              accessibilityLabel={`${group.title}. ${group.description}`}
              style={[styles.row, pickingDisabled && styles.rowDisabled]}
            >
              <View
                style={[
                  styles.check,
                  {
                    borderColor: checked ? colors.accent : colors.border,
                    backgroundColor: checked ? colors.accent : 'transparent',
                  },
                ]}
              >
                {checked ? <Icon name="check" size={16} color={colors.background} /> : null}
              </View>
              <View style={styles.rowCopy}>
                <Text style={[styles.rowTitle, { color: colors.text }]}>{group.title}</Text>
                <Text style={[styles.rowDescription, { color: colors.muted }]}>
                  {group.description}
                </Text>
              </View>
            </PressableScale>
          );
        })}
      </Card>

      <SectionHeader
        title="Preview"
        action={
          preview ? (
            <Chip label="Rebuild" icon="refresh" onPress={() => void buildPreview()} />
          ) : undefined
        }
      />
      <Card contentStyle={preview ? styles.previewCard : styles.emptyCard}>
        {busy === 'preview' ? (
          <View style={styles.building}>
            <ActivityIndicator color={colors.accent} />
            <Text style={[styles.previewNote, { color: colors.muted }]}>
              Reading this device. Apps summary can take a moment.
            </Text>
          </View>
        ) : preview ? (
          <Text style={[styles.preview, { color: colors.text }]}>{preview.text}</Text>
        ) : (
          <>
            <Text style={[styles.previewNote, { color: colors.muted }]}>
              Pick the sections you need, build the preview, then copy, share or export it. What you
              see here is exactly what leaves the app.
            </Text>
            <Button
              title="Build preview"
              icon="report"
              onPress={() => void buildPreview()}
              disabled={selected.size === 0 || busy !== null}
            />
          </>
        )}
      </Card>

      <View style={styles.actions}>
        <Button
          title="Copy text"
          icon="copy"
          variant="secondary"
          onPress={() => void copy()}
          disabled={!canExport}
          style={styles.action}
        />
        <Button
          title="Share text"
          icon="share"
          variant="secondary"
          onPress={() => void share()}
          disabled={!canExport}
          style={styles.action}
        />
      </View>

      {pdfEnabled ? (
        <Button
          title="Share PDF"
          icon="report"
          onPress={() => void savePdf()}
          disabled={!canExport}
        />
      ) : null}

      {notice ? <Text style={[styles.note, { color: colors.muted }]}>{notice}</Text> : null}
      <Text style={[styles.note, { color: colors.muted }]}>
        The report is built on this phone and nothing is uploaded. Values marked ≈ are estimates;
        anything Android did not report reads “Not available on this device”.
      </Text>
      <Text style={[styles.note, { color: colors.muted }]}>
        PDF files leave the app only through the system share sheet.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  count: {
    ...typography.caption,
    fontFamily: 'Inter_600SemiBold',
  },
  toolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  list: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowDisabled: {
    opacity: 0.6,
  },
  rowCopy: {
    flex: 1,
    gap: 2,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: radius.chip,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    ...typography.body,
    fontFamily: 'Inter_600SemiBold',
  },
  rowDescription: {
    ...typography.caption,
  },
  previewCard: {
    gap: spacing.md,
  },
  emptyCard: {
    gap: spacing.md,
  },
  building: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  preview: {
    ...typography.mono,
  },
  previewNote: {
    ...typography.caption,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  action: {
    flex: 1,
  },
  note: {
    ...typography.caption,
  },
});
