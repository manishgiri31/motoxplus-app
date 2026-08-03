import { useEffect } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { interpolate, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { colors, fonts, radii } from '@/src/theme';

export interface ToastProps {
  message: string;
  onHide: () => void;
  durationMs?: number;
  /** Optional trailing action (e.g. "Undo") — omit for a plain message pill. */
  action?: { label: string; onPress: () => void };
}

// Controlled component, mirroring the existing SuccessToast pattern — the
// caller owns the message state and renders <Toast /> conditionally.
export function Toast({ message, onHide, durationMs = 1800, action }: ToastProps) {
  const reduceMotion = useReduceMotion();
  const insets = useSafeAreaInsets();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = reduceMotion ? 1 : withTiming(1, { duration: 220 });

    const timer = setTimeout(() => {
      if (reduceMotion) {
        onHide();
      } else {
        progress.value = withTiming(0, { duration: 180 }, (finished) => {
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
      style={[styles.container, { bottom: 32 + insets.bottom }, animatedStyle]}
    >
      <Animated.View style={[styles.pill, action && styles.pillWithAction]}>
        <Text style={styles.label} numberOfLines={2}>
          {message}
        </Text>
        {action && (
          <Pressable onPress={action.onPress} hitSlop={8} accessibilityRole="button" accessibilityLabel={action.label}>
            <Text style={styles.actionLabel}>{action.label}</Text>
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
    backgroundColor: colors.ink,
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
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  actionLabel: {
    fontFamily: fonts.body.semiBold,
    fontSize: 14,
    color: colors.red,
  },
});
