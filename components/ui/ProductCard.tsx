import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';

import type { Product } from '@/api/types';
import { useWishlistStore } from '@/stores/wishlistStore';
import { Badge } from './Badge';
import { PriceTag } from './PriceTag';

export interface ProductCardProps {
  product: Product;
  onPress: (product: Product) => void;
}

export function ProductCard({ product, onPress }: ProductCardProps) {
  const primaryImage = product.productImages.find((i) => i.isPrimary) ?? product.productImages[0];
  const wishlisted = useWishlistStore((s) => s.isWishlisted(product.id));
  const toggleWishlist = useWishlistStore((s) => s.toggle);

  const outOfStock = product.stock <= 0;

  return (
    <Pressable
      onPress={() => onPress(product)}
      className="w-full bg-white rounded-lg border border-graytone-200 overflow-hidden active:opacity-80"
    >
      <View className="relative">
        <Image
          source={primaryImage ? { uri: primaryImage.imageUrl } : undefined}
          className="w-full h-36 bg-graytone-100"
          contentFit="cover"
          transition={150}
          cachePolicy="disk"
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
          className="absolute top-sm right-sm w-8 h-8 rounded-full bg-white/90 items-center justify-center"
        >
          <Feather name="heart" size={16} color={wishlisted ? '#E4111A' : '#525252'} />
        </Pressable>
        {outOfStock && (
          <View className="absolute bottom-sm left-sm">
            <Badge label="Out of stock" tone="danger" />
          </View>
        )}
      </View>

      <View className="p-md gap-xs">
        <Text className="text-[11px] font-medium text-graytone-500 uppercase" numberOfLines={1}>
          {product.brand}
        </Text>
        <Text className="text-[14px] font-semibold text-black" numberOfLines={2}>
          {product.name}
        </Text>
        <PriceTag price={product.price} mrp={product.mrp} size="sm" />
      </View>
    </Pressable>
  );
}
