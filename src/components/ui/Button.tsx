import { useCallback } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { colors, fonts, radii } from '@/src/theme';
import { HapticService } from '@/utils/haptics';

export type ButtonVariant = 'solid' | 'brand' | 'ghost';

export interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Solid's "darker" pressed shade isn't spec'd as a hex — one step darker than
// ink, close enough to read as a press state without a separate token.
const INK_PRESSED = '#0B0C0E';

const PRESS_DURATION = 120;

export function Button({
  label,
  variant = 'solid',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  onPressIn,
  onPressOut,
  ...pressableProps
}: ButtonProps) {
  const reduceMotion = useReduceMotion();
  const isDisabled = disabled || loading;
  const pressed = useSharedValue(0);

  const handlePressIn = useCallback(
    (e: Parameters<NonNullable<PressableProps['onPressIn']>>[0]) => {
      pressed.value = reduceMotion ? 1 : withTiming(1, { duration: PRESS_DURATION });
      HapticService.light();
      onPressIn?.(e);
    },
    [onPressIn, pressed, reduceMotion]
  );

  const handlePressOut = useCallback(
    (e: Parameters<NonNullable<PressableProps['onPressOut']>>[0]) => {
      pressed.value = reduceMotion ? 0 : withTiming(0, { duration: PRESS_DURATION });
      onPressOut?.(e);
    },
    [onPressOut, pressed, reduceMotion]
  );

  const animatedStyle = useAnimatedStyle(() => {
    const scale = variant === 'solid' ? interpolate(pressed.value, [0, 1], [1, 0.97]) : 1;
    const backgroundColor =
      variant === 'solid'
        ? interpolateColor(pressed.value, [0, 1], [colors.ink, INK_PRESSED])
        : variant === 'brand'
          ? interpolateColor(pressed.value, [0, 1], [colors.red, colors.redPressed])
          : 'transparent';
    const borderColor =
      variant === 'ghost' ? interpolateColor(pressed.value, [0, 1], [colors.line, colors.ink]) : 'transparent';

    return { transform: [{ scale }], backgroundColor, borderColor };
  });

  const labelColor = variant === 'ghost' ? colors.ink : '#FFFFFF';

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.base, variant === 'ghost' && styles.ghostBorder, fullWidth && styles.fullWidth, animatedStyle, isDisabled && styles.disabled, style]}
      {...pressableProps}
    >
      {loading ? (
        <ActivityIndicator size="small" color={labelColor} />
      ) : (
        <View style={styles.content}>
          <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
        </View>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 48,
    paddingHorizontal: 20,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  ghostBorder: {
    borderWidth: 1,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    // Weight lives in the font family (Inter_600SemiBold), not a fontWeight
    // style — see src/theme's typography comment on custom-font synthesis.
    fontFamily: fonts.body.semiBold,
    fontSize: 15.5,
  },
});
