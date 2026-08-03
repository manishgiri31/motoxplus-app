import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { interpolate, interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { colors, radii } from '@/src/theme';

export interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const PRESS_DURATION = 120;

export function Card({ children, onPress, style, accessibilityLabel }: CardProps) {
  const reduceMotion = useReduceMotion();
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(pressed.value, [0, 1], [colors.line, colors.ink]),
    transform: [{ scale: interpolate(pressed.value, [0, 1], [1, 0.98]) }],
  }));

  if (!onPress) {
    return <View style={[styles.base, style]}>{children}</View>;
  }

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onPressIn={() => {
        pressed.value = reduceMotion ? 1 : withTiming(1, { duration: PRESS_DURATION });
      }}
      onPressOut={() => {
        pressed.value = reduceMotion ? 0 : withTiming(0, { duration: PRESS_DURATION });
      }}
      style={[styles.base, animatedStyle, style]}
    >
      {children}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    padding: 16,
  },
});
