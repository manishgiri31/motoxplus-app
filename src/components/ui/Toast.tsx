import { useEffect } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { interpolate, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { colors, fonts, motion, radii } from '@/src/theme';

export interface ToastProps {
  message: string;
  onHide: () => void;
  durationMs?: number;
  /** Optional trailing action (e.g. "Undo") — omit for a plain message pill. */
  action?: { label: string; onPress: () => void };
  /** Distance from the bottom edge. Defaults to just above the tab bar; pass the
   * height of a sticky bottom bar on screens that have one instead. */
  bottomOffset?: number;
}

// Controlled component, mirroring the existing SuccessToast pattern — the
// caller owns the message state and renders <Toast /> conditionally.
export function Toast({ message, onHide, durationMs = 2500, action, bottomOffset }: ToastProps) {
  const reduceMotion = useReduceMotion();
  const insets = useSafeAreaInsets();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = reduceMotion ? 1 : withTiming(1, { duration: motion.duration.fast, easing: motion.easing });

    const timer = setTimeout(() => {
      if (reduceMotion) {
        onHide();
      } else {
        progress.value = withTiming(0, { duration: motion.duration.fast, easing: motion.easing }, (finished) => {
          if (finished) runOnJS(onHide)();
        });
      }
    }, durationMs);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durationMs]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: reduceMotion ? 0 : interpolate(progress.value, [0, 1], [16, 0]) }],
  }));

  return (
    <Animated.View
      pointerEvents={action ? 'box-none' : 'none'}
      style={[styles.container, { bottom: bottomOffset ?? 32 + insets.bottom }, animatedStyle]}
    >
      <Animated.View accessibilityLiveRegion="polite" style={[styles.pill, action && styles.pillWithAction]}>
        <Text style={styles.label} numberOfLines={2}>
          {message}
        </Text>
        {action && (
          <Pressable
            onPress={action.onPress}
            // The pill is 44pt tall; slop makes the action itself a 44pt target.
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            style={({ pressed }) => pressed && { opacity: 0.6 }}
          >
            <Text style={styles.actionLabel} maxFontSizeMultiplier={1.2}>
              {action.label}
            </Text>
          </Pressable>
        )}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  pill: {
    maxWidth: '86%',
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: 'rgba(29,29,31,0.94)',
    borderRadius: radii.pill,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  pillWithAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  label: {
    fontFamily: fonts.body.semiBold,
    fontSize: 14, letterSpacing: -0.224,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  actionLabel: {
    fontFamily: fonts.body.semiBold,
    fontSize: 14, letterSpacing: -0.224,
    color: colors.linkOnDark,
  },
});
