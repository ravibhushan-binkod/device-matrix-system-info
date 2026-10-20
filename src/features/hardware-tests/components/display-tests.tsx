import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card } from '@/design-system/components';
import { withAlpha } from '@/design-system/color';
import { Icon } from '@/design-system/icon';
import { useTheme } from '@/design-system/theme';
import { radius, spacing, typography } from '@/design-system/tokens';

type ColourScreen = {
  name: string;
  hex: string | null;
  dark: boolean;
  gradient?: readonly [string, string, string, string, string];
};

const SCREENS: readonly ColourScreen[] = [
  { name: 'White', hex: '#FFFFFF', dark: true },
  { name: 'Black', hex: '#000000', dark: false },
  { name: 'Red', hex: '#FF0000', dark: false },
  { name: 'Green', hex: '#00FF00', dark: true },
  { name: 'Blue', hex: '#0000FF', dark: false },
  { name: 'Grey', hex: '#808080', dark: false },
  {
    name: 'Gradient',
    hex: null,
    dark: false,
    gradient: ['#FF3B30', '#FFCC00', '#34C759', '#0A84FF', '#AF52DE'],
  },
];

/** Full-screen colour page for dead-pixel and tint checks. */
export function DisplayTest() {
  const { colors } = useTheme();
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const active = SCREENS[index]!;

  const next = () => setIndex((current) => (current + 1) % SCREENS.length);
  const close = () => {
    setOpen(false);
    setIndex(0);
  };

  return (
    <>
      <Card style={styles.previewCard}>
        <LinearGradient
          colors={['#FF3B30', '#FFCC00', '#34C759', '#0A84FF', '#AF52DE']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.preview}
        >
          <View style={styles.previewOverlay}>
            <Icon name="display" size={32} color="#FFFFFF" />
            <Text style={styles.previewText}>Full-screen colour check</Text>
          </View>
        </LinearGradient>
        <View style={styles.swatches}>
          {SCREENS.map((screen) =>
            screen.hex ? (
              <View
                key={screen.name}
                accessibilityLabel={screen.name}
                style={[styles.swatch, { backgroundColor: screen.hex, borderColor: colors.border }]}
              />
            ) : (
              <LinearGradient
                key={screen.name}
                colors={['#FF3B30', '#FFCC00', '#34C759', '#0A84FF', '#AF52DE']}
                style={[styles.swatch, { borderColor: colors.border }]}
              />
            ),
          )}
        </View>
        <Button title="Open full-screen colours" icon="display" onPress={() => setOpen(true)} />
        <Text style={[styles.hint, { color: colors.muted }]}>
          Tap through all seven pages, then close and record the result.
        </Text>
      </Card>

      <Modal
        visible={open}
        animationType="fade"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={close}
      >
        <View style={styles.modalRoot}>
          {active.gradient ? (
            <LinearGradient colors={active.gradient} style={StyleSheet.absoluteFill} />
          ) : null}
          <Pressable
            style={[styles.modalPress, active.hex ? { backgroundColor: active.hex } : null]}
            accessibilityRole="button"
            accessibilityLabel={`${active.name} page. Tap for the next colour.`}
            onPress={next}
          >
            <SafeAreaView style={styles.modalSafe}>
              <View style={styles.modalTop}>
                <Pressable
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel="Close full-screen colours"
                  onPress={close}
                  style={[
                    styles.closeButton,
                    {
                      backgroundColor: active.dark
                        ? 'rgba(11,15,20,0.16)'
                        : 'rgba(255,255,255,0.18)',
                      borderColor: active.dark ? 'rgba(11,15,20,0.28)' : 'rgba(255,255,255,0.35)',
                    },
                  ]}
                >
                  <Icon name="x" size={24} color={active.dark ? '#0B0F14' : '#FFFFFF'} />
                </Pressable>
                <Text style={[styles.pageCount, { color: active.dark ? '#0B0F14' : '#FFFFFF' }]}>
                  {index + 1} / {SCREENS.length}
                </Text>
              </View>
              <View style={styles.modalCentre}>
                <Text style={[styles.colourName, { color: active.dark ? '#0B0F14' : '#FFFFFF' }]}>
                  {active.name}
                </Text>
                <Text
                  style={[
                    styles.tapHint,
                    { color: active.dark ? 'rgba(11,15,20,0.62)' : 'rgba(255,255,255,0.72)' },
                  ]}
                >
                  Tap for the next colour
                </Text>
              </View>
            </SafeAreaView>
          </Pressable>
        </View>
        <StatusBar style={active.dark ? 'dark' : 'light'} />
      </Modal>
    </>
  );
}

const TOUCH_COLOURS = ['#22D3EE', '#A78BFA', '#22C55E', '#F59E0B', '#EF4444', '#4F8CFF'];

type Point = { id: string; x: number; y: number };

function pointsFromEvent(event: GestureResponderEvent): Point[] {
  return event.nativeEvent.touches.map((touch) => ({
    id: String(touch.identifier),
    x: touch.locationX,
    y: touch.locationY,
  }));
}

/** Multi-touch pad: every touch gets a dot and the peak count is recorded. */
export function MultitouchTest() {
  const { colors } = useTheme();
  const [points, setPoints] = useState<Point[]>([]);
  const [maxPoints, setMaxPoints] = useState(0);

  const update = (event: GestureResponderEvent) => {
    const next = pointsFromEvent(event);
    setPoints(next);
    setMaxPoints((previous) => Math.max(previous, next.length));
  };

  const clear = () => setPoints([]);

  return (
    <Card>
      <View style={styles.touchHeader}>
        <View>
          <Text style={[styles.touchCount, { color: colors.text }]}>{points.length} touching</Text>
          <Text style={[styles.touchSub, { color: colors.muted }]}>Peak: {maxPoints} fingers</Text>
        </View>
        <View style={[styles.peakPill, { backgroundColor: withAlpha(colors.accent, 0.14) }]}>
          <Icon name="pointer" size={16} color={colors.accent} />
          <Text style={[styles.peakText, { color: colors.accent }]}>{maxPoints}</Text>
        </View>
      </View>

      <View
        accessible={false}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={update}
        onResponderMove={update}
        onResponderRelease={update}
        onResponderTerminate={clear}
        onResponderTerminationRequest={() => false}
        style={[styles.touchPad, { backgroundColor: colors.surface2, borderColor: colors.border }]}
      >
        <View style={styles.gridLine} pointerEvents="none" />
        <View style={[styles.gridLine, styles.gridLineHorizontal]} pointerEvents="none" />
        {points.map((point) => (
          <View
            key={point.id}
            pointerEvents="none"
            style={[
              styles.touchDot,
              {
                left: point.x - 28,
                top: point.y - 28,
                backgroundColor: withAlpha(
                  TOUCH_COLOURS[Number(point.id) % TOUCH_COLOURS.length] ?? '#22D3EE',
                  0.24,
                ),
                borderColor: TOUCH_COLOURS[Number(point.id) % TOUCH_COLOURS.length] ?? '#22D3EE',
              },
            ]}
          />
        ))}
        {points.length === 0 ? (
          <View style={styles.emptyPad} pointerEvents="none">
            <Icon name="pointer" size={32} color={colors.muted} />
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              Touch here with one or more fingers
            </Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.hint, { color: colors.muted }]}>
        Drag each finger around. The peak count stays until you leave the test.
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  previewCard: {
    gap: spacing.md,
  },
  preview: {
    height: 160,
    borderRadius: radius.button,
    overflow: 'hidden',
  },
  previewOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(11,15,20,0.28)',
  },
  previewText: {
    ...typography.body,
    color: '#FFFFFF',
    fontFamily: 'Inter_600SemiBold',
  },
  swatches: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  swatch: {
    flex: 1,
    height: 24,
    borderRadius: radius.chip,
    borderWidth: StyleSheet.hairlineWidth,
  },
  hint: {
    ...typography.caption,
    lineHeight: 18,
  },
  modalRoot: {
    flex: 1,
  },
  modalPress: {
    flex: 1,
  },
  modalSafe: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  modalTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageCount: {
    ...typography.caption,
    fontFamily: 'Inter_600SemiBold',
  },
  modalCentre: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  colourName: {
    ...typography.display,
  },
  tapHint: {
    ...typography.body,
  },
  touchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  touchCount: {
    ...typography.title,
  },
  touchSub: {
    ...typography.caption,
  },
  peakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.chip,
  },
  peakText: {
    ...typography.caption,
    fontFamily: 'Inter_600SemiBold',
  },
  touchPad: {
    height: 420,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  gridLine: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(138,152,168,0.15)',
  },
  gridLineHorizontal: {
    left: 0,
    right: 0,
    top: '50%',
    bottom: undefined,
    width: undefined,
    height: StyleSheet.hairlineWidth,
  },
  touchDot: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
  },
  emptyPad: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  emptyText: {
    ...typography.caption,
    textAlign: 'center',
    maxWidth: 220,
  },
});
