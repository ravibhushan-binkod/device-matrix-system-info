import * as Application from 'expo-application';
import * as Haptics from 'expo-haptics';
import { type Href, usePathname, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  BackHandler,
  findNodeHandle,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  FadeInDown,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useMotionPreference } from '@/design-system/animations/use-motion-preference';
import { durations } from '@/design-system/animations/motion';
import { AppLogo } from '@/design-system/components/brand-logo';
import { Icon, type IconName } from '@/design-system/icon';
import { useTheme } from '@/design-system/theme';
import { radius, spacing, typography } from '@/design-system/tokens';
import { rateApp } from '@/features/about/services/rate-app';

type MenuItem = {
  label: string;
  href?: Href;
  icon: IconName;
  action?: 'rate';
};

const ITEMS: readonly MenuItem[] = [
  { label: 'Export info', href: '/report', icon: 'report' },
  { label: 'Hardware tests', href: '/hardware-tests', icon: 'wrench' },
  { label: 'Widgets', href: '/widgets', icon: 'apps' },
  { label: 'Privacy policy', href: '/privacy', icon: 'shield' },
  { label: 'About', href: '/about', icon: 'info' },
  { label: 'Rate the app', icon: 'star', action: 'rate' },
];

const PANEL_TEXT = '#E8EEF5';
const PANEL_MUTED = '#A9B6C6';
const PANEL_BORDER = 'rgba(232,238,245,0.12)';

type Props = {
  open: boolean;
  onClose: () => void;
  onOpenDeveloperTools: () => void;
};

/**
 * Dark-glass navigation drawer. It slides in from the left, closes on a scrim
 * tap, a left swipe, Android Back before navigator handling, or choosing an
 * item. It never opens from an edge swipe. TalkBack focus moves into the panel
 * and the rest of the app is hidden from the accessibility tree while it is
 * open.
 */
export function AppDrawer({ open, onClose, onOpenDeveloperTools }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const motion = useMotionPreference();
  const panelWidth = Math.min(320, Math.round(width * 0.82));
  const versionPresses = useRef(0);
  const headerRef = useRef<View>(null);

  const progress = useSharedValue(0);
  const dragX = useSharedValue(0);

  const version = Application.nativeApplicationVersion?.trim() || '1.0.0';

  useEffect(() => {
    if (open) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
      if (motion.animate) {
        progress.value = withTiming(1, { duration: durations.normal });
      } else {
        progress.value = 1;
      }
      return;
    }

    if (motion.allowFade) {
      progress.value = withTiming(0, { duration: durations.fast });
    } else {
      progress.value = 0;
    }
  }, [motion.allowFade, motion.animate, open, progress]);

  useEffect(() => {
    if (!open) {
      versionPresses.current = 0;
      return;
    }

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    const timer = setTimeout(
      () => {
        const node = findNodeHandle(headerRef.current);
        if (node != null) AccessibilityInfo.setAccessibilityFocus(node);
      },
      motion.allowFade ? durations.normal + 40 : 20,
    );

    return () => {
      subscription.remove();
      clearTimeout(timer);
    };
  }, [motion.allowFade, onClose, open]);

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: progress.value * 0.66,
  }));

  const panelStyle = useAnimatedStyle(() => {
    const freeWidth = Math.max(0, panelWidth);
    return {
      opacity: progress.value,
      transform: [
        {
          translateX: motion.animate
            ? interpolate(progress.value, [0, 1], [-freeWidth, 0]) + dragX.value
            : 0,
        },
      ],
    };
  });

  const swipe = Gesture.Pan()
    .activeOffsetX(-14)
    .failOffsetY([-28, 28])
    .onUpdate((event) => {
      if (event.translationX < 0) {
        dragX.value = event.translationX;
      }
    })
    .onEnd((event) => {
      if (event.translationX < -60 || event.velocityX < -500) {
        dragX.value = 0;
        runOnJS(onClose)();
      } else {
        dragX.value = withSpring(0, { damping: 20, stiffness: 220 });
      }
    });

  const active = (href: Href | undefined) => {
    if (!href) return false;
    const path = String(href);
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  const go = (href: Href) => {
    onClose();
    setTimeout(() => router.push(href), 40);
  };

  const choose = (item: MenuItem) => {
    if (item.action === 'rate') {
      onClose();
      setTimeout(() => void rateApp(), 180);
      return;
    }
    if (item.href) go(item.href);
  };

  const longPressVersion = () => {
    versionPresses.current += 1;
    if (versionPresses.current < 5) return;
    versionPresses.current = 0;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    onClose();
    setTimeout(onOpenDeveloperTools, 180);
  };

  const entering = (index: number) => {
    if (!motion.allowFade) return undefined;
    return motion.animate
      ? FadeInDown.duration(durations.normal).delay(index * 32)
      : FadeIn.duration(durations.fast).delay(index * 16);
  };

  return (
    <View
      pointerEvents={open ? 'auto' : 'none'}
      style={[StyleSheet.absoluteFill, styles.overlay]}
      accessibilityElementsHidden={!open}
      importantForAccessibility={open ? 'yes' : 'no-hide-descendants'}
    >
      <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, scrimStyle]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close menu"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <GestureDetector gesture={swipe}>
        <Animated.View
          accessibilityViewIsModal
          style={[styles.panel, { width: panelWidth, paddingBottom: insets.bottom }, panelStyle]}
        >
          <LinearGradient
            colors={['#111B26', '#080D13']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.scroll, { paddingTop: insets.top + spacing.md }]}
          >
            <View
              ref={headerRef}
              accessible
              accessibilityRole="header"
              accessibilityLabel="Device Matrix menu"
              style={styles.header}
            >
              <AppLogo size={42} decorative />
              <View style={styles.headerCopy}>
                <Text style={styles.headerTitle}>Device Matrix</Text>
                <Text style={styles.headerSubtitle}>System Info</Text>
              </View>
            </View>

            <View style={styles.rule} />

            <View style={styles.items}>
              {ITEMS.map((item, index) => {
                const selected = item.action == null && active(item.href);
                return (
                  <Animated.View key={`${open}-${item.label}`} entering={entering(index)}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={item.label}
                      accessibilityState={{ selected }}
                      onPress={() => choose(item)}
                      style={({ pressed }) => [
                        styles.item,
                        pressed && styles.itemPressed,
                        { borderColor: selected ? `${colors.accent}66` : 'transparent' },
                      ]}
                    >
                      {selected ? (
                        <Animated.View
                          entering={motion.allowFade ? FadeIn.duration(durations.fast) : undefined}
                          style={[
                            StyleSheet.absoluteFill,
                            styles.activePill,
                            { backgroundColor: `${colors.accent}20` },
                          ]}
                        />
                      ) : null}
                      <Icon
                        name={item.icon}
                        size={20}
                        color={selected ? colors.accent : PANEL_MUTED}
                      />
                      <Text
                        style={[styles.itemLabel, { color: selected ? colors.accent : PANEL_TEXT }]}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  </Animated.View>
                );
              })}
            </View>

            <View style={styles.footer}>
              <View style={styles.rule} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Version ${version}`}
                accessibilityHint={
                  __DEV__ ? 'Long press five times for developer tools' : undefined
                }
                delayLongPress={450}
                onLongPress={__DEV__ ? longPressVersion : undefined}
                style={styles.versionRow}
              >
                <Text style={styles.version}>Version {version}</Text>
              </Pressable>
              <Text style={styles.footerLine}>Free app, supported by ads.</Text>
            </View>
          </ScrollView>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    zIndex: 40,
  },
  scrim: {
    backgroundColor: '#000000',
  },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#0B1118',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: PANEL_BORDER,
    overflow: 'hidden',
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerCopy: {
    flex: 1,
    gap: 1,
  },
  headerTitle: {
    ...typography.title,
    color: PANEL_TEXT,
  },
  headerSubtitle: {
    ...typography.caption,
    color: PANEL_MUTED,
  },
  rule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: PANEL_BORDER,
    marginVertical: spacing.md,
  },
  items: {
    gap: spacing.xs,
  },
  item: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.button,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  itemPressed: {
    opacity: 0.7,
  },
  activePill: {
    borderRadius: radius.button,
  },
  itemLabel: {
    ...typography.body,
    flexShrink: 1,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: spacing.xl,
  },
  versionRow: {
    alignSelf: 'flex-start',
    minHeight: 32,
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  version: {
    ...typography.caption,
    color: PANEL_MUTED,
  },
  footerLine: {
    ...typography.caption,
    color: PANEL_MUTED,
    marginTop: 2,
  },
});
