import { Feather } from '@expo/vector-icons';
import { memo, useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import type { Product } from '@/api/types';
import { usePulseAnimation } from '@/hooks/use-pulse-animation';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useWishlistStore } from '@/stores/wishlistStore';
import { HapticService } from '@/utils/haptics';
import { getImageSource } from '@/utils/image';
import { Badge } from './Badge';
import { Image } from './Image';
import { PriceTag } from './PriceTag';

export interface ProductCardProps {
  product: Product;
  onPress: (product: Product) => void;
}

// Memoized: this renders inside FlatList grids of 10-50+ items, and the
// parent list re-renders on every pull-to-refresh/pagination tick — without
// this, every card would re-render even though only new items were added.
export const ProductCard = memo(function ProductCard({ product, onPress }: ProductCardProps) {
  // productImages is reliably present wherever this card is fed data today
  // (GET /api/products[/:id] only), but Product is a shared type also used
  // for cart/order line items where the backend omits this field entirely —
  // guard here so a future data source swap can't reintroduce the crash
  // that hit the cart screen for the same reason.
  const primaryImage = product.productImages?.find((i) => i.isPrimary) ?? product.productImages?.[0];
  const wishlisted = useWishlistStore((s) => s.isWishlisted(product.id));
  const toggleWishlist = useWishlistStore((s) => s.toggle);
  const colors = useThemeColors();

  const outOfStock = product.stock <= 0;
  const handlePress = useCallback(() => onPress(product), [onPress, product]);
  const heartPulse = usePulseAnimation();

  return (
    // Plain View here (not Pressable): Pressable defaults accessible={true},
    // which on iOS VoiceOver collapses its entire subtree into one focus
    // stop — the wishlist heart below would become unreachable by swipe
    // navigation if it were nested inside an accessible outer Pressable.
    // "relative" lives here instead of on the image wrapper so the heart's
    // absolute position is unchanged (zero padding above it either way).
    <View className="relative w-full bg-card rounded-lg border border-border overflow-hidden">
      <Pressable
        onPress={handlePress}
        className="active:opacity-80"
        accessibilityRole="button"
        accessibilityLabel={`${product.name}, ${product.brand}${outOfStock ? ', out of stock' : ''}`}
      >
        <View className="relative">
          <Image
            source={getImageSource(primaryImage?.imageUrl)}
            className="w-full h-36 bg-surface"
            contentFit="cover"
            transition={150}
            cachePolicy="memory-disk"
            recyclingKey={product.id}
          />
          {outOfStock && (
            <View className="absolute bottom-sm left-sm">
              <Badge label="Out of stock" tone="danger" />
            </View>
          )}
        </View>

        <View className="p-md gap-xs">
          <Text className="text-[11px] font-medium text-muted uppercase" numberOfLines={1}>
            {product.brand}
          </Text>
          <Text className="text-[14px] font-semibold text-text" numberOfLines={2}>
            {product.name}
          </Text>
          <PriceTag price={product.price} mrp={product.mrp} size="sm" />
        </View>
      </Pressable>

      <Pressable
        onPress={() => {
          HapticService.light();
          heartPulse.pulse();
          toggleWishlist({
            productId: product.id,
            name: product.name,
            price: product.price,
            mrp: product.mrp,
            imageUrl: primaryImage?.imageUrl ?? null,
            brand: product.brand,
          });
        }}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        // Visual chip stays 32x32 (unchanged design) — hitSlop brings the
        // effective touch target up to the 44x44 accessibility minimum.
        className="absolute top-sm right-sm w-8 h-8 rounded-full bg-card/90 items-center justify-center"
      >
        <Animated.View style={heartPulse.style}>
          <Feather name="heart" size={16} color={wishlisted ? colors.primary : colors.muted} />
        </Animated.View>
      </Pressable>
    </View>
  );
});
