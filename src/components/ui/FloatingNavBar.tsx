import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { alpha, colors, font, layout, screenPaddingX } from '@/src/theme';

import { NavBarBackground } from './NavBarBackground';

export const FLOATING_NAV_HEIGHT = 44;

export interface FloatingNavAction {
  /** Any icon element, ~22pt. Rendered inside a 44pt hit area. */
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  /** For toggles such as the wishlist heart. */
  selected?: boolean;
}

export interface FloatingNavBarProps {
  title?: string;
  onBack: () => void;
  actions?: FloatingNavAction[];
  /** Shared scroll offset. Without it the bar stays transparent. */
  scrollY?: SharedValue<number>;
  /** Offset range over which the bar goes from transparent to solid. */
  solidRange?: [number, number];
  /** Offset range over which the inline title fades in. */
  titleRange?: [number, number];
}

// Transparent bar that floats over the content and turns into the standard
// translucent (blurred on iOS) bar with a hairline once the user scrolls. Use
// it on screens that open with a full-bleed image; render it as the last child
// so it overlays the scroll view. The screen must hide the native header.
export function FloatingNavBar({
  title,
  onBack,
  actions = [],
  scrollY,
  solidRange = [120, 220],
  titleRange = [solidRange[1], solidRange[1] + 80],
}: FloatingNavBarProps) {
  const insets = useSafeAreaInsets();

  const backgroundStyle = useAnimatedStyle(() => ({
    opacity: scrollY ? interpolate(scrollY.value, solidRange, [0, 1], Extrapolation.CLAMP) : 0,
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: scrollY ? interpolate(scrollY.value, titleRange, [0, 1], Extrapolation.CLAMP) : 0,
  }));

  return (
    <View pointerEvents="box-none" style={[styles.bar, { height: FLOATING_NAV_HEIGHT + insets.top, paddingTop: insets.top }]}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, backgroundStyle]}>
        <NavBarBackground />
        <View style={styles.hairline} />
      </Animated.View>

      <View style={styles.row} pointerEvents="box-none">
        <NavButton label="Back" onPress={onBack} icon={<Feather name="chevron-left" size={26} color={colors.ink} />} />
        <View style={styles.titleWrap} pointerEvents="none">
          {!!title && (
            <Animated.Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={[styles.title, titleStyle]}>
              {title}
            </Animated.Text>
          )}
        </View>
        <View style={styles.actions}>
          {actions.map((action, i) => (
            <NavButton key={i} {...action} />
          ))}
        </View>
      </View>
    </View>
  );
}

function NavButton({ icon, label, onPress, selected }: FloatingNavAction) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={selected == null ? undefined : { selected }}
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
    >
      <View style={styles.buttonFill}>{icon}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { position: 'absolute', top: 0, left: 0, right: 0 },
  hairline: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.line,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: screenPaddingX - 8,
  },
  titleWrap: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  title: { ...font(600), fontSize: 17, lineHeight: 22, letterSpacing: -0.34, color: colors.ink },
  actions: { flexDirection: 'row', alignItems: 'center', minWidth: layout.minTouchTarget },
  // 44pt hit area around a 36pt translucent disc, so icons stay legible over any image.
  button: { width: layout.minTouchTarget, height: layout.minTouchTarget, alignItems: 'center', justifyContent: 'center' },
  buttonPressed: { opacity: 0.6 },
  buttonFill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: alpha(colors.white, 0.8),
  },
});
