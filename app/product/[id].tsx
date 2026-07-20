import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAddToCart } from '@/api/hooks/useCart';
import { useProduct, useProducts } from '@/api/hooks/useProducts';
import { ProductGallery } from '@/components/ProductGallery';
import { Badge, Button, ErrorState, PriceTag, ProductCard } from '@/components/ui';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useRecentlyViewedStore } from '@/stores/recentlyViewedStore';
import { useWishlistStore } from '@/stores/wishlistStore';
import { HapticService } from '@/utils/haptics';

function SpecRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <View className="flex-row justify-between py-sm border-b border-border">
      <Text className="text-[13px] text-muted">{label}</Text>
      <Text className="text-[13px] font-medium text-text flex-1 text-right" numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const productQuery = useProduct(id);
  const product = productQuery.data;
  const colors = useThemeColors();

  const addToCart = useAddToCart();
  const recordView = useRecentlyViewedStore((s) => s.recordView);
  const wishlisted = useWishlistStore((s) => (product ? s.isWishlisted(product.id) : false));
  const toggleWishlist = useWishlistStore((s) => s.toggle);

  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (product) {
      recordView(product.id);
      setQuantity(product.moq);
      navigation.setOptions({ title: product.name });
    }
  }, [product, navigation, recordView]);

  // "Related products" has no backend endpoint — this is an honest, derivable
  // stand-in: other products in the same category (see docs/api.md §4).
  const relatedQuery = useProducts({ category: product?.category.slug, pageSize: 8 });
  const related = (relatedQuery.data?.products ?? []).filter((p) => p.id !== product?.id).slice(0, 6);

  if (productQuery.isLoading || !product) {
    if (productQuery.isError) {
      return (
        <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
          <ErrorState error={productQuery.error} onRetry={() => productQuery.refetch()} />
        </SafeAreaView>
      );
    }
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center" edges={['bottom']}>
        <Text className="text-muted">Loading…</Text>
      </SafeAreaView>
    );
  }

  const outOfStock = product.stock <= 0;
  const primaryImage = product.productImages?.find((i) => i.isPrimary) ?? product.productImages?.[0];

  const handleAddToCart = () => {
    HapticService.light();
    addToCart.mutate(
      { payload: { productId: product.id, quantity }, product },
      {
        onSuccess: () => Alert.alert('Added to cart', `${product.name} × ${quantity}`),
        onError: () => Alert.alert('Could not add to cart', 'Please try again.'),
      }
    );
  };

  const handleShare = () => {
    Share.share({
      message: `${product.name} — ${product.brand} (Part #${product.partNumber}) on MotoXPlus`,
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
      <ScrollView contentContainerClassName="pb-2xl">
        <ProductGallery images={product.productImages ?? []} />

        <View className="p-lg gap-md">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-md gap-xxs">
              <Text className="text-[12px] font-semibold uppercase text-muted">{product.brand}</Text>
              <Text className="text-h2 font-bold text-text">{product.name}</Text>
              <Text className="text-[12px] text-muted">Part #{product.partNumber}</Text>
            </View>
            <View className="flex-row gap-md">
              <Pressable onPress={handleShare} hitSlop={12} accessibilityRole="button" accessibilityLabel="Share product">
                <Feather name="share-2" size={22} color={colors.text} />
              </Pressable>
              <Pressable
                onPress={() => {
                  HapticService.light();
                  toggleWishlist({
                    productId: product.id,
                    name: product.name,
                    price: product.price,
                    mrp: product.mrp,
                    imageUrl: primaryImage?.imageUrl ?? null,
                    brand: product.brand,
                  });
                }}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                <Feather name="heart" size={22} color={wishlisted ? colors.primary : colors.text} />
              </Pressable>
            </View>
          </View>

          <PriceTag price={product.price} mrp={product.mrp} size="lg" />
          <Text className="text-[12px] text-muted -mt-sm">Dealer price · GST {product.gstRate}% extra</Text>

          <View className="flex-row items-center gap-sm">
            <Badge label={outOfStock ? 'Out of stock' : `${product.stock} in stock`} tone={outOfStock ? 'danger' : 'success'} />
            {product.warranty && product.warranty !== 'No Warranty' && <Badge label={product.warranty} tone="neutral" />}
          </View>

          <View className="mt-md">
            <Text className="text-h3 font-semibold text-text mb-sm">Specifications</Text>
            <SpecRow label="Brand" value={product.brand} />
            <SpecRow label="Part number" value={product.partNumber} />
            <SpecRow label="SKU" value={product.sku} />
            <SpecRow label="OEM number" value={product.oemNumber} />
            <SpecRow label="HSN code" value={product.hsnCode} />
            <SpecRow label="Country of origin" value={product.countryOfOrigin} />
            <SpecRow label="Minimum order qty" value={String(product.moq)} />
            {product.compatibility.length > 0 && (
              <SpecRow label="Compatible with" value={product.compatibility.join(', ')} />
            )}
          </View>

          {product.description && (
            <View className="mt-md">
              <Text className="text-h3 font-semibold text-text mb-sm">Description</Text>
              <Text className="text-[14px] text-muted leading-5">{product.description}</Text>
            </View>
          )}
        </View>

        {related.length > 0 && (
          <View className="gap-md mt-lg">
            <Text className="text-h3 font-semibold text-text px-lg">More from {product.category.name}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="px-lg gap-md">
              {related.map((p) => (
                <View key={p.id} className="w-40">
                  <ProductCard product={p} onPress={(item) => router.push(`/product/${item.id}`)} />
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      <View className="flex-row items-center gap-md p-lg border-t border-border">
        <View className="flex-row items-center border border-border rounded-md">
          <Pressable
            onPress={() => {
              HapticService.medium();
              setQuantity((q) => Math.max(product.moq, q - product.moq));
            }}
            className="w-10 h-11 items-center justify-center"
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel="Decrease quantity"
          >
            <Feather name="minus" size={16} color={colors.text} />
          </Pressable>
          <Text className="w-10 text-center text-[15px] font-semibold text-text">{quantity}</Text>
          <Pressable
            onPress={() => {
              HapticService.medium();
              setQuantity((q) => q + product.moq);
            }}
            className="w-10 h-11 items-center justify-center"
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel="Increase quantity"
          >
            <Feather name="plus" size={16} color={colors.text} />
          </Pressable>
        </View>
        <Button
          label={outOfStock ? 'Out of stock' : 'Add to cart'}
          onPress={handleAddToCart}
          loading={addToCart.isPending}
          disabled={outOfStock}
          fullWidth
          size="lg"
          className="flex-1"
        />
      </View>
    </SafeAreaView>
  );
}
