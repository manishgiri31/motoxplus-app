import { useCallback } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { interpolate, interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useFocusRing } from '@/hooks/use-focus-ring';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { colors, fonts, motion, radii } from '@/src/theme';
import { HapticService } from '@/utils/haptics';

// brand: primary — solid blue pill (the only place the accent fills a surface).
// ghost: secondary — blue outline pill.
// solid: ink-filled pill, for the rare neutral call-to-action.
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

// Interaction state driven through one shared value: 0 = rest, 1 = hover
// (web / pointer devices), 2 = pressed. Colors interpolate between the three.
const REST = 0;
const HOVER = 1;
const PRESSED = 2;

const GHOST_TINT = {
  rest: 'rgba(0,113,227,0)',
  hover: 'rgba(0,113,227,0.08)',
  pressed: 'rgba(0,113,227,0.16)',
};

export function Button({
  label,
  variant = 'solid',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  onPressIn,
  onPressOut,
  onFocus,
  onBlur,
  onHoverIn,
  onHoverOut,
  ...pressableProps
}: ButtonProps) {
  const reduceMotion = useReduceMotion();
  const focusRing = useFocusRing();
  const isDisabled = disabled || loading;
  const state = useSharedValue(REST);

  const goTo = useCallback(
    (next: number) => {
      state.value = reduceMotion ? next : withTiming(next, { duration: motion.duration.fast, easing: motion.easing });
    },
    [reduceMotion, state]
  );

  const handlePressIn = useCallback(
    (e: Parameters<NonNullable<PressableProps['onPressIn']>>[0]) => {
      goTo(PRESSED);
      HapticService.light();
      onPressIn?.(e);
    },
    [goTo, onPressIn]
  );

  const handlePressOut = useCallback(
    (e: Parameters<NonNullable<PressableProps['onPressOut']>>[0]) => {
      goTo(REST);
      onPressOut?.(e);
    },
    [goTo, onPressOut]
  );

  const animatedStyle = useAnimatedStyle(() => {
    const inputs = [REST, HOVER, PRESSED];
    const scale = interpolate(state.value, inputs, [1, 1, motion.pressScale]);
    const backgroundColor =
      variant === 'brand'
        ? interpolateColor(state.value, inputs, [colors.accent, colors.accentHover, colors.accentActive])
        : variant === 'solid'
          ? interpolateColor(state.value, inputs, [colors.ink, colors.black, colors.black])
          : interpolateColor(state.value, inputs, [GHOST_TINT.rest, GHOST_TINT.hover, GHOST_TINT.pressed]);

    return { transform: [{ scale }], backgroundColor };
  });

  const labelColor = variant === 'ghost' ? colors.link : colors.white;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onHoverIn={(e) => {
        if (!isDisabled) goTo(HOVER);
        onHoverIn?.(e);
      }}
      onHoverOut={(e) => {
        goTo(REST);
        onHoverOut?.(e);
      }}
      onFocus={(e) => {
        focusRing.onFocus();
        onFocus?.(e);
      }}
      onBlur={(e) => {
        focusRing.onBlur();
        onBlur?.(e);
      }}
      style={[
        styles.base,
        variant === 'ghost' && styles.ghostBorder,
        fullWidth && styles.fullWidth,
        animatedStyle,
        focusRing.ringStyle,
        isDisabled && styles.disabled,
        style,
      ]}
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
    minHeight: 48,
    minWidth: 44,
    paddingHorizontal: 24,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  ghostBorder: {
    borderColor: colors.accent,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.4,
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
    fontSize: 17,
    letterSpacing: -0.374,
  },
});
