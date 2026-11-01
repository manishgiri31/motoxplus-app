import type { ReactNode } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NavBarBackground } from '@/src/components/ui/NavBarBackground';
import { colors, screenPaddingX, space } from '@/src/theme';

export interface CheckoutBottomBarProps {
  children: ReactNode;
  /** Reports the bar's height so the scroll content can pad itself clear of it. */
  onHeightChange?: (height: number) => void;
  /** Set when the bar sits directly above the tab bar, which already clears the home indicator. */
  aboveTabBar?: boolean;
}

// Translucent white bar pinned to the bottom (blur on iOS, near-opaque white on
// Android) with a hairline on its top edge. Content scrolls underneath it.
export function CheckoutBottomBar({ children, onHeightChange, aboveTabBar = false }: CheckoutBottomBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => onHeightChange?.(e.nativeEvent.layout.height)}
      style={[styles.bar, { paddingBottom: aboveTabBar ? space.md : Math.max(insets.bottom, space.md) }]}
    >
      <NavBarBackground />
      <View style={styles.hairline} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: space.md },
  hairline: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.line,
  },
  content: { paddingHorizontal: screenPaddingX, gap: space.sm },
});
