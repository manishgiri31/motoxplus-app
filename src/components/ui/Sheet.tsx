import { Feather } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { Extrapolation, interpolate, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { alpha, colors, layout, motion, screenPaddingX, textStyles } from '@/src/theme';

const SHEET_RADIUS = 24;

/** The lowest and highest resting points: 50% and 90% of the screen by default. */
export type SheetDetent = 'half' | 'full';

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  /** Fractions of the screen height the sheet can rest at, e.g. [0.5, 0.9]. */
  detents?: number[];
  /** Index into `detents` the sheet opens at (uncontrolled). */
  initialDetent?: number;
  /** Controlled detent: 'half' is the lowest resting point, 'full' the highest. */
  detent?: SheetDetent;
  /** Called when a drag settles on a different detent. */
  onDetentChange?: (detent: SheetDetent) => void;
  /** Wrap `children` in a padded ScrollView. Off by default: the caller then lays out (and scrolls) the content itself. */
  scrollable?: boolean;
  /** Pinned under the content (a "Done" button, usually). */
  footer?: ReactNode;
  children: ReactNode;
}

// Bottom sheet: drag handle, rounded top (24), a scrim, and resting detents.
// Dragging the handle/title area moves it between detents; flinging it below
// the lowest detent (or tapping the scrim / the close button) dismisses it.
// The sheet's height is animated rather than its offset so the scrolling
// content always fits the visible part, at every detent.
export function Sheet({
  visible,
  onClose,
  title,
  detents = [0.5, 0.9],
  initialDetent = 0,
  detent,
  onDetentChange,
  scrollable = false,
  footer,
  children,
}: SheetProps) {
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();

  const heights = useMemo(
    () => [...detents].sort((a, b) => a - b).map((d) => Math.round(d * windowHeight)),
    [detents, windowHeight]
  );
  const maxHeight = heights[heights.length - 1];
  const detentIndex = detent ? (detent === 'full' ? heights.length - 1 : 0) : Math.min(initialDetent, heights.length - 1);
  const openHeight = heights[detentIndex];

  const handleSnap = useCallback(
    (index: number) => onDetentChange?.(index === heights.length - 1 && heights.length > 1 ? 'full' : 'half'),
    [heights.length, onDetentChange]
  );

  const sheetHeight = useSharedValue(0);
  const startHeight = useSharedValue(0);
  // Stays mounted through the closing animation.
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    const timing = { duration: reduceMotion ? 0 : motion.duration.base, easing: motion.easing };
    if (visible) {
      setMounted(true);
      sheetHeight.value = 0;
      sheetHeight.value = withTiming(openHeight, timing);
    } else {
      sheetHeight.value = withTiming(0, timing, (finished) => {
        if (finished) runOnJS(setMounted)(false);
      });
    }
    // openHeight is read only when opening; resizing while open must not re-run this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Controlled detent changed from outside (e.g. a "see all" link): glide there.
  useEffect(() => {
    if (!visible || !detent) return;
    sheetHeight.value = withTiming(openHeight, { duration: reduceMotion ? 0 : motion.duration.base, easing: motion.easing });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detent]);

  const pan = useMemo(() => {
    const timing = { duration: reduceMotion ? 0 : motion.duration.base, easing: motion.easing };
    return Gesture.Pan()
      .onStart(() => {
        startHeight.value = sheetHeight.value;
      })
      .onUpdate((e) => {
        sheetHeight.value = Math.min(maxHeight, Math.max(0, startHeight.value - e.translationY));
      })
      .onEnd((e) => {
        // Project where the sheet would land, then snap to the nearest resting point.
        const projected = sheetHeight.value - e.velocityY * 0.15;
        let target = 0;
        let targetIndex = -1;
        let best = Math.abs(projected);
        for (let i = 0; i < heights.length; i++) {
          const distance = Math.abs(projected - heights[i]);
          if (distance < best) {
            best = distance;
            target = heights[i];
            targetIndex = i;
          }
        }
        if (targetIndex < 0) {
          // The effect above animates the rest of the way down once the parent hides us.
          runOnJS(onClose)();
        } else {
          sheetHeight.value = withTiming(target, timing);
          runOnJS(handleSnap)(targetIndex);
        }
      });
  }, [handleSnap, heights, maxHeight, onClose, reduceMotion, sheetHeight, startHeight]);

  const sheetStyle = useAnimatedStyle(() => ({ height: sheetHeight.value }));
  const scrimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(sheetHeight.value, [0, openHeight], [0, 1], Extrapolation.CLAMP),
  }));

  if (!mounted) return null;

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent onRequestClose={onClose}>
      {/* Android Modals are separate windows, so gesture-handler needs its own root inside. */}
      <GestureHandlerRootView style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, scrimStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
        </Animated.View>

        <Animated.View style={[styles.sheet, sheetStyle]} accessibilityViewIsModal>
          <GestureDetector gesture={pan}>
            <View collapsable={false}>
              <View style={styles.handleWrap}>
                <View style={styles.handle} />
              </View>
              <View style={styles.header}>
                <Text style={styles.title} accessibilityRole="header" numberOfLines={1} maxFontSizeMultiplier={1.2}>
                  {title ?? ''}
                </Text>
                <Pressable
                  onPress={onClose}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  style={({ pressed }) => [styles.close, pressed && styles.pressed]}
                >
                  <Feather name="x" size={22} color={colors.ink2} />
                </Pressable>
              </View>
            </View>
          </GestureDetector>

          {scrollable ? (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={[styles.content, { paddingBottom: footer ? 16 : insets.bottom + 24 }]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>
          ) : (
            <View style={styles.scroll}>{children}</View>
          )}

          {!!footer && <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>{footer}</View>}
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  scrim: { backgroundColor: alpha(colors.black, 0.4) },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: SHEET_RADIUS,
    borderTopRightRadius: SHEET_RADIUS,
    overflow: 'hidden',
  },
  // 44pt tall grab area around the 36x5 handle.
  handleWrap: { height: layout.minTouchTarget - 16, alignItems: 'center', justifyContent: 'center', paddingTop: 8 },
  handle: { width: 36, height: 5, borderRadius: 3, backgroundColor: colors.line },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: layout.minTouchTarget,
    paddingLeft: screenPaddingX,
    paddingRight: screenPaddingX - 12,
  },
  title: { flex: 1, ...textStyles.cardTitle },
  close: { width: layout.minTouchTarget, height: layout.minTouchTarget, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.6 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: screenPaddingX, paddingTop: 8, gap: 24 },
  footer: {
    paddingHorizontal: screenPaddingX,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    backgroundColor: colors.white,
  },
});
