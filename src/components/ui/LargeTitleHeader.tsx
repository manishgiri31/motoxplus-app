import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, font, screenPaddingX, textStyles } from '@/src/theme';

import { NavBarBackground } from './NavBarBackground';

// Height of the large-title block; the inline bar takes over as the user
// scrolls past it.
const LARGE_TITLE_HEIGHT = 41;
const COMPACT_BAR_HEIGHT = 44;

/**
 * Scroll plumbing for a collapsing title. Put `onScroll` on an
 * Animated.ScrollView / Animated.FlatList (scrollEventThrottle 16) and hand
 * `scrollY` to <LargeTitleHeader> and <CompactTitleBar>.
 */
export function useLargeTitleScroll() {
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });
  return { scrollY, onScroll };
}

export interface LargeTitleHeaderProps {
  title: string;
  /** One calm gray line under the title. */
  subtitle?: string;
  /** Pass the shared scroll offset to fade the large title as the inline bar appears. */
  scrollY?: SharedValue<number>;
  numberOfLines?: number;
  /** Small 14pt ink2 line above the title (a greeting). */
  eyebrow?: string;
  /** 'small' renders the subtitle at 14pt instead of 17pt. */
  subtitleSize?: 'body' | 'small';
  /** Extra content under the title block. It stays put while the title fades. */
  children?: ReactNode;
}

// 34pt left-aligned semi-bold title that sits at the top of the scrolling
// content. With `scrollY` it fades out as the user scrolls and
// <CompactTitleBar> fades in the 17pt inline version.
export function LargeTitleHeader({
  title,
  subtitle,
  scrollY,
  numberOfLines = 2,
  eyebrow,
  subtitleSize = 'body',
  children,
}: LargeTitleHeaderProps) {
  const animatedStyle = useAnimatedStyle(() => {
    if (!scrollY) return {};
    return {
      opacity: interpolate(scrollY.value, [0, LARGE_TITLE_HEIGHT], [1, 0], Extrapolation.CLAMP),
    };
  });

  return (
    <View>
      <Animated.View style={[styles.wrap, animatedStyle]}>
        {!!eyebrow && (
          <Text style={styles.eyebrow} maxFontSizeMultiplier={1.2}>
            {eyebrow}
          </Text>
        )}
        <Text
          accessibilityRole="header"
          aria-level={1}
          numberOfLines={numberOfLines}
          maxFontSizeMultiplier={1.2}
          style={styles.title}
        >
          {title}
        </Text>
        {!!subtitle && (
          <Text style={[styles.subtitle, subtitleSize === 'small' && styles.subtitleSmall]} maxFontSizeMultiplier={1.2}>
            {subtitle}
          </Text>
        )}
      </Animated.View>
      {!!children && <View style={styles.extra}>{children}</View>}
    </View>
  );
}

export interface CompactTitleBarProps {
  title: string;
  scrollY: SharedValue<number>;
}

// The inline 17pt title: a translucent bar pinned under the status bar that
// fades in (with a hairline) once the large title has scrolled away. Render it
// as the last child of the screen so it overlays the scrolling content.
export function CompactTitleBar({ title, scrollY }: CompactTitleBarProps) {
  const insets = useSafeAreaInsets();
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [LARGE_TITLE_HEIGHT * 0.6, LARGE_TITLE_HEIGHT], [0, 1], Extrapolation.CLAMP),
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.bar, { height: COMPACT_BAR_HEIGHT + insets.top, paddingTop: insets.top }, animatedStyle]}
    >
      <NavBarBackground />
      <Text style={styles.barTitle} numberOfLines={1} maxFontSizeMultiplier={1.2}>
        {title}
      </Text>
      <View style={styles.hairline} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: screenPaddingX, gap: 4 },
  title: { ...textStyles.largeTitle },
  eyebrow: { ...textStyles.callout },
  subtitle: { ...textStyles.body, color: colors.ink2 },
  subtitleSmall: { ...textStyles.callout },
  extra: { paddingHorizontal: screenPaddingX, marginTop: 12 },
  bar: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
  barTitle: { ...font(600), fontSize: 17, lineHeight: 22, letterSpacing: -0.34, color: colors.ink, maxWidth: '70%' },
  hairline: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.line,
  },
});
