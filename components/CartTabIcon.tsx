import { useEffect, useRef } from 'react';
import { Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useCart } from '@/api/hooks/useCart';
import { ShoppingBag } from '@/components/icons/ShoppingBag';
import { iconSizes, iconStroke } from '@/components/icons/iconSizes';
import { usePulseAnimation } from '@/hooks/use-pulse-animation';

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
    <View>
      <ShoppingBag
        size={iconSizes.tabBar}
        color={color}
        strokeWidth={focused ? iconStroke.selected : iconStroke.default}
      />
      {count > 0 && (
        <Animated.View
          style={badgePulse.style}
          className="absolute -top-1 -right-1.5 h-4 min-w-[16px] rounded-full bg-danger items-center justify-center px-xxs"
        >
          <Text className="text-[10px] font-bold text-white">{count > 99 ? '99+' : count}</Text>
        </Animated.View>
      )}
    </View>
  );
}
