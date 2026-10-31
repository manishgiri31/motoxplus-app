import { Pressable, StyleSheet, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { interpolate, interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useFocusRing } from '@/hooks/use-focus-ring';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { colors, layout, motion, radii } from '@/src/theme';

import { useSectionTone } from './Section';

export interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Padding grows with the viewport (24 phone / 32 tablet / 40 desktop) so cards
// feel roomy on wide screens without crowding 375px-wide two-column grids.
function usePadding() {
  const { width } = useWindowDimensions();
  if (width >= layout.breakpoints.desktop) return layout.cardPadding.desktop;
  if (width >= layout.breakpoints.phone) return layout.cardPadding.tablet;
  return layout.cardPadding.mobile;
}

export function Card({ children, onPress, style, accessibilityLabel }: CardProps) {
  const reduceMotion = useReduceMotion();
  const focusRing = useFocusRing();
  const pressed = useSharedValue(0);
  const padding = usePadding();
  // Grey card on a white section, white card on a grey one.
  const restColor = useSectionTone() === 'alt' ? colors.white : colors.card;

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(pressed.value, [0, 1], [restColor, colors.lineSoft]),
    transform: [{ scale: interpolate(pressed.value, [0, 1], [1, motion.pressScale]) }],
  }));

  if (!onPress) {
    return <View style={[styles.base, { padding, backgroundColor: restColor }, style]}>{children}</View>;
  }

  const animateTo = (value: number) => {
    pressed.value = reduceMotion ? value : withTiming(value, { duration: motion.duration.fast, easing: motion.easing });
  };

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onPressIn={() => animateTo(1)}
      onPressOut={() => animateTo(0)}
      onHoverIn={() => animateTo(1)}
      onHoverOut={() => animateTo(0)}
      onFocus={focusRing.onFocus}
      onBlur={focusRing.onBlur}
      style={[styles.base, { padding }, animatedStyle, focusRing.ringStyle, style]}
    >
      {children}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
  },
});
