import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card, Screen, SectionHeader, Skeleton } from '@/design-system/components';
import { useTheme } from '@/design-system/theme';
import { spacing, typography } from '@/design-system/tokens';
import {
  buildSupportMatrix,
  summarizeMatrix,
} from '@/features/support-matrix/services/matrix-service';
import type { MatrixEntry, MatrixSection } from '@/features/support-matrix/types';

/**
 * Dev-only support matrix: every reading this app can produce, grouped per
 * screen, marked ok / unavailable. Lets the team see exactly what a phone
 * hides before shipping.
 */
export function SupportMatrixScreen() {
  const [sections, setSections] = useState<MatrixSection[] | null>(null);

  useEffect(() => {
    let alive = true;
    buildSupportMatrix()
      .then((value) => {
        if (alive) setSections(value);
      })
      .catch(() => {
        if (alive) setSections([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  const summary = sections == null ? null : summarizeMatrix(sections);

  return (
    <Screen scroll contentStyle={styles.content}>
      {sections == null || summary == null ? (
        <MatrixSkeleton />
      ) : (
        <MatrixContent sections={sections} summary={summary} />
      )}
    </Screen>
  );
}

function MatrixContent({
  sections,
  summary,
}: {
  sections: MatrixSection[];
  summary: { ok: number; unavailable: number };
}) {
  const { colors } = useTheme();

  return (
    <>
      <Card>
        <View style={styles.cardBody}>
          <Text style={[styles.summary, { color: colors.text }]}>
            {summary.ok} available · {summary.unavailable} unavailable
          </Text>
          <Text style={[styles.caption, { color: colors.muted }]}>
            Green means Android returned a value; grey means the phone blocks or hides it.
            Developer-only screen.
          </Text>
        </View>
      </Card>

      {sections.map((section) => {
        const counts = summarizeMatrix([section]);
        return (
          <View key={section.key} style={styles.group}>
            <SectionHeader title={`${section.title} · ${counts.ok}/${section.entries.length}`} />
            <Card>
              <View style={styles.cardBody}>
                {section.entries.map((item) => (
                  <MatrixRow key={item.key} entry={item} />
                ))}
              </View>
            </Card>
          </View>
        );
      })}
    </>
  );
}

function MatrixRow({ entry }: { entry: MatrixEntry }) {
  const { colors } = useTheme();
  const available = entry.value != null;

  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: available ? colors.good : colors.muted }]} />
      <View style={styles.rowBody}>
        <Text style={[styles.label, { color: colors.muted }]}>{entry.label}</Text>
        <Text style={[styles.value, { color: available ? colors.text : colors.muted }]}>
          {entry.value ?? 'Not available'}
        </Text>
        {entry.note ? <Text style={[styles.caption, { color: colors.muted }]}>{entry.note}</Text> : null}
      </View>
    </View>
  );
}

function MatrixSkeleton() {
  return (
    <View style={styles.content}>
      {[0, 1, 2].map((card) => (
        <Card key={card}>
          <View style={styles.cardBody}>
            <Skeleton width="45%" height={16} />
            {[0, 1, 2, 3].map((row) => (
              <Skeleton key={row} height={14} />
            ))}
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
  group: {
    gap: spacing.sm,
  },
  cardBody: {
    gap: spacing.sm,
  },
  summary: {
    ...typography.title,
  },
  caption: {
    ...typography.caption,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  rowBody: {
    flex: 1,
    gap: spacing.xs,
  },
  label: {
    ...typography.caption,
  },
  value: {
    ...typography.body,
    fontVariant: ['tabular-nums'],
  },
});
