import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useCart } from '@/api/hooks/useCart';
import { ShoppingBag } from '@/components/icons/ShoppingBag';
import { iconSizes, iconStroke } from '@/components/icons/iconSizes';
import { usePulseAnimation } from '@/hooks/use-pulse-animation';
import { colors, font } from '@/src/theme';

const BADGE_SIZE = 16;

export function CartTabIcon({ color, focused }: { color: string; focused: boolean }) {
  // Same queryKey as the Cart screen's own useCart() — React Query shares
  // the cached result instead of firing a second request for the badge.
  const { data: cart } = useCart();
  const count = cart?.items.length ?? 0;
  const badgePulse = usePulseAnimation(1.4, 90);
  const previousCount = useRef(count);

  useEffect(() => {
    if (count !== previousCount.current && count > 0) {
      badgePulse.pulse();
    }
    previousCount.current = count;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  return (
    <View style={styles.wrap}>
      <ShoppingBag
        size={iconSizes.tabBar}
        color={color}
        strokeWidth={focused ? iconStroke.selected : iconStroke.default}
      />
      {count > 0 && (
        <Animated.View style={[styles.badge, badgePulse.style]}>
          <Text style={styles.badgeText} maxFontSizeMultiplier={1}>
            {count > 99 ? '99+' : count}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: iconSizes.tabBar, height: iconSizes.tabBar },
  badge: {
    position: 'absolute',
    top: -4,
    left: iconSizes.tabBar - 10,
    minWidth: BADGE_SIZE,
    height: BADGE_SIZE,
    paddingHorizontal: 4,
    borderRadius: BADGE_SIZE / 2,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    // Separates the badge from the icon stroke underneath.
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  badgeText: { ...font(600), fontSize: 10, lineHeight: 12, color: colors.white, fontVariant: ['tabular-nums'] },
});
