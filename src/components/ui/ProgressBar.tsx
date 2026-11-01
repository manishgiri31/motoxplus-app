import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { colors, motion, radii } from '@/src/theme';

export interface ProgressBarProps {
  /** 0 to 1. Values outside the range are clamped. */
  progress: number;
  /** Fill color: accent by default, success once a goal is reached. */
  color?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

// 6pt pill track with an animated fill. Exposed to screen readers as a
// progressbar with a percentage value.
export function ProgressBar({ progress, color = colors.accent, accessibilityLabel, style }: ProgressBarProps) {
  const reduceMotion = useReduceMotion();
  const clamped = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  const fill = useSharedValue(clamped);

  useEffect(() => {
    fill.value = reduceMotion ? clamped : withTiming(clamped, { duration: motion.duration.slow, easing: motion.easing });
  }, [clamped, fill, reduceMotion]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={[styles.track, style]}
    >
      <Animated.View style={[styles.fill, { backgroundColor: color }, fillStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 6, borderRadius: radii.pill, backgroundColor: colors.line, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radii.pill },
});
