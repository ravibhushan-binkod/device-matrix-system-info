import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/design-system/animations/pressable-scale';
import { Button, Card, Chip, Screen, SectionHeader } from '@/design-system/components';
import { Icon } from '@/design-system/icon';
import { useTheme } from '@/design-system/theme';
import { radius, spacing, typography } from '@/design-system/tokens';
import { useReport } from '@/features/report/hooks/use-report';
import { REPORT_GROUPS } from '@/features/report/services/report-service';

/** The report composer: pick sections, preview the text, copy / share / PDF. */
export function ReportScreen() {
  const { colors } = useTheme();
  const {
    selected,
    toggle,
    selectAll,
    clearAll,
    copy,
    share,
    savePdf,
    pdfEnabled,
    notice,
    busy,
    text,
  } = useReport();
  const canExport = selected.size > 0;

  return (
    <Screen scroll contentStyle={styles.content}>
      <SectionHeader title="Sections" />
      <View style={styles.toolbar}>
        <Chip label="Select all" onPress={selectAll} />
        <Chip label="Clear" onPress={clearAll} />
      </View>

      <Card>
        <View style={styles.list}>
          {REPORT_GROUPS.map((group) => {
            const checked = selected.has(group.id);
            return (
              <PressableScale
                key={group.id}
                onPress={() => toggle(group.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked }}
                accessibilityLabel={group.title}
                style={styles.row}
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
                <Text style={[styles.rowTitle, { color: colors.text }]}>{group.title}</Text>
              </PressableScale>
            );
          })}
        </View>
      </Card>

      <SectionHeader title="Preview" />
      <Card>
        <Text style={[styles.preview, { color: canExport ? colors.text : colors.muted }]}>
          {canExport ? text : 'Pick at least one section to build the report.'}
        </Text>
      </Card>

      <View style={styles.actions}>
        <Button
          title="Copy"
          icon="copy"
          variant="secondary"
          onPress={copy}
          disabled={!canExport || busy}
          style={styles.action}
        />
        <Button
          title="Share"
          icon="share"
          onPress={share}
          disabled={!canExport || busy}
          style={styles.action}
        />
      </View>

      {pdfEnabled ? (
        <Button
          title="Save as PDF"
          icon="report"
          variant="secondary"
          onPress={savePdf}
          disabled={!canExport || busy}
        />
      ) : null}

      {notice ? <Text style={[styles.note, { color: colors.muted }]}>{notice}</Text> : null}
      <Text style={[styles.note, { color: colors.muted }]}>
        The report is built on this phone. Nothing is uploaded.
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
  toolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  list: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
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
  },
  preview: {
    ...typography.mono,
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
