import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { memo, useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { Product } from '@/api/types';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useWishlistStore } from '@/stores/wishlistStore';
import { Badge } from './Badge';
import { PriceTag } from './PriceTag';

export interface ProductCardProps {
  product: Product;
  onPress: (product: Product) => void;
}

// Memoized: this renders inside FlatList grids of 10-50+ items, and the
// parent list re-renders on every pull-to-refresh/pagination tick — without
// this, every card would re-render even though only new items were added.
export const ProductCard = memo(function ProductCard({ product, onPress }: ProductCardProps) {
  const primaryImage = product.productImages.find((i) => i.isPrimary) ?? product.productImages[0];
  const wishlisted = useWishlistStore((s) => s.isWishlisted(product.id));
  const toggleWishlist = useWishlistStore((s) => s.toggle);
  const colors = useThemeColors();

  const outOfStock = product.stock <= 0;
  const handlePress = useCallback(() => onPress(product), [onPress, product]);

  return (
    <Pressable
      onPress={handlePress}
      className="w-full bg-card rounded-lg border border-border overflow-hidden active:opacity-80"
    >
      <View className="relative">
        <Image
          source={primaryImage ? { uri: primaryImage.imageUrl } : undefined}
          className="w-full h-36 bg-surface"
          contentFit="cover"
          transition={150}
          cachePolicy="memory-disk"
          recyclingKey={product.id}
        />
        <Pressable
          onPress={() =>
            toggleWishlist({
              productId: product.id,
              name: product.name,
              price: product.price,
              mrp: product.mrp,
              imageUrl: primaryImage?.imageUrl ?? null,
              brand: product.brand,
            })
          }
          hitSlop={8}
          className="absolute top-sm right-sm w-8 h-8 rounded-full bg-card/90 items-center justify-center"
        >
          <Feather name="heart" size={16} color={wishlisted ? colors.primary : colors.muted} />
        </Pressable>
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
  );
});
