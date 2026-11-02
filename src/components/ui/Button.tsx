import { Feather } from '@expo/vector-icons';
import { useCallback, type ComponentType } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { interpolate, interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { iconSizes } from '@/components/icons/iconSizes';
import type { IconProps } from '@/components/icons/types';
import { useFocusRing } from '@/hooks/use-focus-ring';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { alpha, colors, font, layout, motion, radii } from '@/src/theme';
import { HapticService } from '@/utils/haptics';

// primary     red pill, white text: the one main action on a screen.
// secondary   red outline pill.
// destructive red text, no fill: sign out, delete, cancel order.
// link        plain red text with a trailing chevron.
//
// 'brand' / 'ghost' / 'solid' are the names the app has always used; they
// keep working and map to primary / secondary / an ink-filled pill, so no
// call site had to change.
//
// light: white pill with ink text, the primary action on a dark (ink) card.
export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'link' | 'brand' | 'ghost' | 'solid' | 'light';

type CanonicalVariant = 'primary' | 'secondary' | 'destructive' | 'link' | 'solid' | 'light';

const ALIASES: Record<ButtonVariant, CanonicalVariant> = {
  primary: 'primary',
  secondary: 'secondary',
  destructive: 'destructive',
  link: 'link',
  solid: 'solid',
  light: 'light',
  brand: 'primary',
  ghost: 'secondary',
};

export interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  /** Link variant only: hide the trailing chevron. */
  hideChevron?: boolean;
  /** Optional leading icon from components/icons, drawn at the inline size. */
  icon?: ComponentType<IconProps>;
  /** Icon colour; defaults to the label colour. */
  iconColor?: string;
  style?: StyleProp<ViewStyle>;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// One shared value drives every interaction state: 0 rest, 1 hover (pointer
// devices), 2 pressed. Background colors interpolate across the three.
const REST = 0;
const HOVER = 1;
const PRESSED = 2;

const BACKGROUNDS: Record<CanonicalVariant, [string, string, string]> = {
  primary: [colors.accent, colors.accentHover, colors.accentActive],
  solid: [colors.ink, colors.black, colors.black],
  light: [colors.white, colors.white, colors.lineSoft],
  secondary: [alpha(colors.accent, 0), alpha(colors.accent, 0.08), alpha(colors.accent, 0.16)],
  destructive: [alpha(colors.red, 0), alpha(colors.red, 0.08), alpha(colors.red, 0.16)],
  link: [alpha(colors.link, 0), alpha(colors.link, 0.06), alpha(colors.link, 0.12)],
};

const LABEL_COLOR: Record<CanonicalVariant, string> = {
  primary: colors.white,
  solid: colors.white,
  light: colors.ink,
  secondary: colors.link,
  destructive: colors.red,
  link: colors.link,
};

export function Button({
  label,
  variant = 'solid',
  loading = false,
  disabled = false,
  fullWidth = false,
  hideChevron = false,
  icon: LeadingIcon,
  iconColor,
  style,
  onPressIn,
  onPressOut,
  onFocus,
  onBlur,
  onHoverIn,
  onHoverOut,
  ...pressableProps
}: ButtonProps) {
  const kind = ALIASES[variant];
  const reduceMotion = useReduceMotion();
  const focusRing = useFocusRing();
  const isDisabled = disabled || loading;
  const state = useSharedValue(REST);
  const labelColor = LABEL_COLOR[kind];

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
    return {
      transform: [{ scale: interpolate(state.value, inputs, [1, 1, motion.pressScale]) }],
      backgroundColor: interpolateColor(state.value, inputs, BACKGROUNDS[kind]),
    };
  });

  return (
    <AnimatedPressable
      accessibilityRole={kind === 'link' ? 'link' : 'button'}
      accessibilityLabel={label}
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
        kind === 'secondary' && styles.outline,
        kind === 'link' && styles.link,
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
          {LeadingIcon && (
            <View style={styles.icon}>
              <LeadingIcon size={iconSizes.inline} color={iconColor ?? labelColor} />
            </View>
          )}
          <Text style={[styles.label, { color: labelColor }]} maxFontSizeMultiplier={1.2} numberOfLines={1}>
            {label}
          </Text>
          {kind === 'link' && !hideChevron && <Feather name="chevron-right" size={18} color={labelColor} />}
        </View>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    // 50pt tall pill. minHeight (not height) so larger Dynamic Type can grow it;
    // it also means a caller's `height` can't shrink a button below 50.
    minHeight: 50,
    minWidth: layout.minTouchTarget,
    paddingHorizontal: 24,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outline: { borderWidth: 1, borderColor: colors.accent },
  // Plain links hug their text; 44pt is the minimum touch target.
  link: { minHeight: layout.minTouchTarget, paddingHorizontal: 8 },
  fullWidth: { width: '100%' },
  disabled: { opacity: 0.4 },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2 },
  icon: { marginRight: 6 },
  label: { ...font(600), fontSize: 17, lineHeight: 22, letterSpacing: -0.34 },
});
