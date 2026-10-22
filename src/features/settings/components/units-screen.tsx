import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/design-system/animations/pressable-scale';
import { Button, Card, Screen, SectionHeader } from '@/design-system/components';
import { Icon } from '@/design-system/icon';
import { useTheme } from '@/design-system/theme';
import { spacing, typography } from '@/design-system/tokens';
import {
  DEFAULT_UNIT_PREFERENCES,
  resolvedUnitLabel,
  resolveUnits,
  UNIT_SETTINGS,
  useUnitsStore,
  type UnitCategory,
} from '@/core/units';
import { UnitPickerSheet } from '@/features/settings/components/unit-picker-sheet';

/**
 * Settings · Units and formats. Every row starts at "System default" and
 * shows the value resolved from the phone's locale/region in grey; the exact
 * choice can be overridden row by row.
 */
export function UnitsScreen() {
  const { colors } = useTheme();
  const preferences = useUnitsStore((state) => state.preferences);
  const setPreference = useUnitsStore((state) => state.setPreference);
  const resetUnits = useUnitsStore((state) => state.resetUnits);
  const [editing, setEditing] = useState<UnitCategory | null>(null);
  /** What `system` means on this phone, independent of any row override. */
  const systemUnits = useMemo(() => resolveUnits(DEFAULT_UNIT_PREFERENCES), []);

  const activeSetting =
    editing == null ? null : (UNIT_SETTINGS.find((s) => s.key === editing) ?? null);

  return (
    <Screen scroll contentStyle={styles.content}>
      <SectionHeader title="Units and formats" />
      <Card contentStyle={styles.stack}>
        <Text style={[typography.body, { color: colors.muted }]}>
          Every reading follows these choices. Rows left at “System default” follow this phone’s
          region and language; the resolved value is shown next to them and updates when you change
          a row.
        </Text>
      </Card>

      {UNIT_SETTINGS.map((setting) => {
        const selectedValue = preferences[setting.key];
        const selectedOption =
          setting.options.find((option) => option.value === selectedValue) ?? setting.options[0];
        const resolved = resolvedUnitLabel(setting.key, systemUnits);
        return (
          <PressableScale
            key={setting.key}
            accessibilityRole="button"
            accessibilityLabel={`${setting.title}. ${
              selectedValue === 'system'
                ? `System default, ${resolved}`
                : (selectedOption?.label ?? 'System default')
            }. Change`}
            onPress={() => setEditing(setting.key)}
            haptic={false}
          >
            <Card contentStyle={styles.row}>
              <View style={styles.copy}>
                <Text style={[typography.body, { color: colors.text }]}>{setting.title}</Text>
                <Text style={[typography.caption, { color: colors.muted }]}>
                  {setting.description}
                </Text>
                <Text style={[typography.caption, styles.value]}>
                  <Text style={{ color: colors.accent }}>
                    {selectedOption?.label ?? 'System default'}
                  </Text>
                  {selectedValue === 'system' ? (
                    <Text style={{ color: colors.muted }}> ({resolved})</Text>
                  ) : null}
                </Text>
              </View>
              <Icon name="chevron-right" size={16} color={colors.muted} />
            </Card>
          </PressableScale>
        );
      })}

      <Button title="Reset units to default" variant="ghost" icon="refresh" onPress={resetUnits} />

      <Card contentStyle={styles.stack}>
        <Text style={[typography.caption, { color: colors.muted }]}>
          Choices are saved only on this phone (temperature and storage are also written to the Home
          widget’s local preferences). No unit choice leaves the device.
        </Text>
      </Card>

      {activeSetting ? (
        <UnitPickerSheet
          visible
          title={activeSetting.title}
          options={activeSetting.options}
          value={preferences[activeSetting.key]}
          resolvedLabel={resolvedUnitLabel(activeSetting.key, systemUnits)}
          onSelect={(value) => setPreference(activeSetting.key, value)}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  stack: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  value: {
    marginTop: spacing.xs,
  },
});
