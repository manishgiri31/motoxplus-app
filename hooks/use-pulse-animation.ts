import { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

/**
 * Small reusable "pop" micro-interaction: scale up then back to 1, total
 * duration well under 300ms. Call `pulse()` imperatively from an event
 * handler (a press, a value change) and spread `style` onto an
 * `Animated.View`/`Animated.Text` wrapping the thing that should react.
 */
export function usePulseAnimation(scale = 1.3, legDurationMs = 110) {
  const scaleValue = useSharedValue(1);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
  }));

  const pulse = () => {
    scaleValue.value = withSequence(
      withTiming(scale, { duration: legDurationMs }),
      withTiming(1, { duration: legDurationMs })
    );
  };

  return { style, pulse };
}
