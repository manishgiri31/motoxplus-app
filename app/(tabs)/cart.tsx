import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { memo, useMemo } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAddToCart, useCart, useRemoveCartItem } from '@/api/hooks/useCart';
import type { CartItem } from '@/api/types';
import { Button, EmptyState, ErrorState, Image, ListRowSkeleton } from '@/components/ui';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useWishlistStore } from '@/stores/wishlistStore';
import { formatCurrency } from '@/utils/format';
import { HapticService } from '@/utils/haptics';
import { getImageSource } from '@/utils/image';

const FREE_DELIVERY_THRESHOLD = 25000;

const CartRow = memo(function CartRow({ item }: { item: CartItem }) {
  const addToCart = useAddToCart();
  const removeItem = useRemoveCartItem();
  const toggleWishlist = useWishlistStore((s) => s.toggle);
  const colors = useThemeColors();

  const unitPrice = item.variant?.price ?? item.product.price;
  const moq = item.product.moq;
  // Unlike GET /api/products[/:id], GET /api/cart's embedded product does not
  // include productImages (see docs/api.md §6) — only category is promised.
  // Guard against the missing field instead of assuming every Product-shaped
  // object was fetched from the products endpoints.
  const primaryImage = item.product.productImages?.find((i) => i.isPrimary) ?? item.product.productImages?.[0];
  const atMinQuantity = item.quantity - moq < moq;

  const changeQuantity = (nextQuantity: number) => {
    if (nextQuantity < moq) return;
    HapticService.medium();
    addToCart.mutate({
      payload: { productId: item.productId, quantity: nextQuantity, variantId: item.variantId ?? undefined },
      product: item.product,
      variant: item.variant ?? undefined,
    });
  };

  const moveToWishlist = () => {
    // Removing from cart is the dominant, visible effect here — one medium
    // haptic, not a light (wishlist) + medium (remove) double-fire.
    HapticService.medium();
    toggleWishlist({
      productId: item.product.id,
      name: item.product.name,
      price: item.product.price,
      mrp: item.product.mrp,
      imageUrl: primaryImage?.imageUrl ?? null,
      brand: item.product.brand,
    });
    removeItem.mutate(item.id);
  };

  return (
    <View className="flex-row gap-md p-lg border-b border-border">
      <Image
        source={getImageSource(primaryImage?.imageUrl)}
        className="w-16 h-16 rounded-md bg-surface"
        cachePolicy="memory-disk"
        recyclingKey={item.productId}
      />
      <View className="flex-1 gap-xs">
        <Text className="text-[14px] font-semibold text-text" numberOfLines={2}>
          {item.product.name}
        </Text>
        {item.variant && <Text className="text-[12px] text-muted">{item.variant.label}</Text>}
        <Text className="text-[14px] font-bold text-text">{formatCurrency(unitPrice)}</Text>

        <View className="flex-row items-center justify-between mt-xs">
          <View className="flex-row items-center border border-border rounded-md">
            <Pressable
              onPress={() => changeQuantity(item.quantity - moq)}
              disabled={atMinQuantity}
              className="w-9 h-9 items-center justify-center"
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Decrease quantity"
            >
              <Feather name="minus" size={16} color={atMinQuantity ? colors.border : colors.text} />
            </Pressable>
            <Text className="w-8 text-center text-[14px] font-semibold text-text">{item.quantity}</Text>
            <Pressable
              onPress={() => changeQuantity(item.quantity + moq)}
              className="w-9 h-9 items-center justify-center"
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Increase quantity"
            >
              <Feather name="plus" size={16} color={colors.text} />
            </Pressable>
          </View>

          <View className="flex-row gap-lg">
            <Pressable onPress={moveToWishlist} hitSlop={13} accessibilityRole="button" accessibilityLabel="Move to wishlist">
              <Feather name="heart" size={18} color={colors.muted} />
            </Pressable>
            <Pressable
              onPress={() => {
                HapticService.medium();
                removeItem.mutate(item.id);
              }}
              hitSlop={13}
              accessibilityRole="button"
              accessibilityLabel="Remove item"
            >
              <Feather name="trash-2" size={18} color={colors.danger} />
            </Pressable>
          </View>
        </View>
        {moq > 1 && <Text className="text-[11px] text-muted">Sold in multiples of {moq}</Text>}
      </View>
    </View>
  );
});

export default function CartScreen() {
  const { data: cart, isLoading, isError, error, refetch, isRefetching } = useCart();
  const items = cart?.items ?? [];

  const onRefresh = () => {
    HapticService.light();
    refetch();
  };

  const totals = useMemo(() => {
    const cartItems = cart?.items ?? [];
    let subtotal = 0;
    let gstAmount = 0;
    for (const item of cartItems) {
      const unitPrice = item.variant?.price ?? item.product.price;
      const lineSubtotal = unitPrice * item.quantity;
      subtotal += lineSubtotal;
      gstAmount += (lineSubtotal * item.product.gstRate) / 100;
    }
    const taxedTotal = subtotal + gstAmount;
    const shipping = cartItems.length === 0 ? 0 : taxedTotal >= FREE_DELIVERY_THRESHOLD ? 0 : Math.round(taxedTotal * 0.05 * 100) / 100;
    return { subtotal, gstAmount, shipping, grandTotal: taxedTotal + shipping };
  }, [cart]);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        {Array.from({ length: 4 }).map((_, i) => (
          <ListRowSkeleton key={i} />
        ))}
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <ErrorState error={error} onRetry={refetch} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="px-lg pt-sm pb-lg">
        <Text className="text-h2 font-bold text-text">Cart</Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <CartRow item={item} />}
        contentContainerClassName={items.length === 0 ? 'flex-1' : 'pb-lg'}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <EmptyState
            icon="shopping-cart"
            title="Your cart is empty"
            message="Browse the catalog and add parts to get started."
            actionLabel="Browse products"
            onAction={() => router.push('/(tabs)')}
          />
        }
      />

      {items.length > 0 && (
        <View className="border-t border-border px-lg pt-lg pb-sm gap-sm">
          <View className="flex-row justify-between">
            <Text className="text-[14px] text-muted">Subtotal</Text>
            <Text className="text-[14px] text-text">{formatCurrency(totals.subtotal)}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-[14px] text-muted">GST</Text>
            <Text className="text-[14px] text-text">{formatCurrency(totals.gstAmount)}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-[14px] text-muted">Shipping</Text>
            <Text className="text-[14px] text-text">
              {totals.shipping === 0 ? 'Free' : formatCurrency(totals.shipping)}
            </Text>
          </View>
          <View className="flex-row justify-between pt-sm border-t border-border">
            <Text className="text-[16px] font-bold text-text">Total</Text>
            <Text className="text-[16px] font-bold text-text">{formatCurrency(totals.grandTotal)}</Text>
          </View>
          <Text className="text-[11px] text-muted">
            Final total is confirmed by the server when you place the order.
          </Text>

          <Button
            label="Proceed to checkout"
            fullWidth
            size="lg"
            onPress={() => {
              if (items.some((i) => i.product.stock <= 0)) {
                HapticService.error();
                Alert.alert('Some items are out of stock', 'Remove out-of-stock items before checking out.');
                return;
              }
              router.push('/checkout');
            }}
          />
        </View>
      )}
    </SafeAreaView>
  );
}
