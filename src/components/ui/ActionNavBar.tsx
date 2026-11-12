import Feather from '@expo/vector-icons/Feather';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, font, layout, screenPaddingX, textStyles } from '@/src/theme';

import { NavBarBackground } from './NavBarBackground';

export const ACTION_NAV_HEIGHT = 44;

export interface NavBarAction {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
}

export interface ActionNavBarProps {
  /** Inline 17pt title; fades in once the large title has scrolled away. */
  title: string;
  onBack: () => void;
  /** Trailing text action (e.g. "Submit"): the screen's primary action, so it takes the accent. */
  action?: NavBarAction;
  scrollY: SharedValue<number>;
}

// Nav bar for form screens: back chevron on the left, the primary action on
// the right. The bar itself (translucent, blurred on iOS, hairline) is
// transparent over the large title and fades in as the title scrolls under it.
// Render it as the last child of the screen so it overlays the scroll view.
export function ActionNavBar({ title, onBack, action, scrollY }: ActionNavBarProps) {
  const insets = useSafeAreaInsets();
  // The large title is one line tall; the bar and inline title take over as it leaves.
  const collapse = textStyles.largeTitle.lineHeight;

  const backgroundStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [collapse * 0.6, collapse], [0, 1], Extrapolation.CLAMP),
  }));

  return (
    <View
      pointerEvents="box-none"
      style={[styles.bar, { height: ACTION_NAV_HEIGHT + insets.top, paddingTop: insets.top }]}
    >
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, backgroundStyle]}>
        <NavBarBackground />
        <View style={styles.hairline} />
      </Animated.View>

      <View style={styles.row} pointerEvents="box-none">
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          {/* Ink, like the back button in the native headers and on product pages. */}
          <Feather name="chevron-left" size={28} color={colors.ink} />
        </Pressable>

        <Animated.Text
          pointerEvents="none"
          numberOfLines={1}
          maxFontSizeMultiplier={1.2}
          style={[styles.title, backgroundStyle]}
        >
          {title}
        </Animated.Text>

        <View style={styles.actionSlot}>
          {!!action && (
            <Pressable
              onPress={action.onPress}
              disabled={action.disabled || action.loading}
              accessibilityRole="button"
              accessibilityLabel={action.accessibilityLabel ?? action.label}
              accessibilityState={{ disabled: !!action.disabled, busy: !!action.loading }}
              style={({ pressed }) => [styles.action, pressed && styles.pressed]}
            >
              {action.loading ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <Text
                  maxFontSizeMultiplier={1.2}
                  style={[styles.actionLabel, { color: action.disabled ? colors.ink3 : colors.accent }]}
                >
                  {action.label}
                </Text>
              )}
            </Pressable>
          )}
        </View>
      </View>
    </View>
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
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: screenPaddingX - 12 },
  back: { width: layout.minTouchTarget, height: layout.minTouchTarget, alignItems: 'center', justifyContent: 'center' },
  title: {
    ...font(600),
    position: 'absolute',
    left: 72,
    right: 72,
    textAlign: 'center',
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.34,
    color: colors.ink,
  },
  actionSlot: { marginLeft: 'auto', minWidth: layout.minTouchTarget },
  action: { minWidth: layout.minTouchTarget, minHeight: layout.minTouchTarget, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  actionLabel: { ...font(600), fontSize: 17, lineHeight: 22, letterSpacing: -0.34 },
  pressed: { opacity: 0.6 },
});
