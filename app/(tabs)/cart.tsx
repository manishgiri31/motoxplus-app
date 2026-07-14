import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { memo, useMemo } from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAddToCart, useCart, useRemoveCartItem } from '@/api/hooks/useCart';
import type { CartItem } from '@/api/types';
import { Button, EmptyState, ErrorState, ListRowSkeleton } from '@/components/ui';
import { useWishlistStore } from '@/stores/wishlistStore';
import { formatCurrency } from '@/utils/format';

const FREE_DELIVERY_THRESHOLD = 25000;

const CartRow = memo(function CartRow({ item }: { item: CartItem }) {
  const addToCart = useAddToCart();
  const removeItem = useRemoveCartItem();
  const toggleWishlist = useWishlistStore((s) => s.toggle);

  const unitPrice = item.variant?.price ?? item.product.price;
  const moq = item.product.moq;
  const primaryImage = item.product.productImages.find((i) => i.isPrimary) ?? item.product.productImages[0];

  const changeQuantity = (nextQuantity: number) => {
    if (nextQuantity < moq) return;
    addToCart.mutate({
      payload: { productId: item.productId, quantity: nextQuantity, variantId: item.variantId ?? undefined },
      product: item.product,
      variant: item.variant ?? undefined,
    });
  };

  const moveToWishlist = () => {
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
    <View className="flex-row gap-md p-lg border-b border-graytone-100">
      <Image
        source={primaryImage ? { uri: primaryImage.imageUrl } : undefined}
        className="w-16 h-16 rounded-md bg-graytone-100"
        cachePolicy="memory-disk"
        recyclingKey={item.productId}
      />
      <View className="flex-1 gap-xs">
        <Text className="text-[14px] font-semibold text-black" numberOfLines={2}>
          {item.product.name}
        </Text>
        {item.variant && <Text className="text-[12px] text-graytone-500">{item.variant.label}</Text>}
        <Text className="text-[14px] font-bold text-black">{formatCurrency(unitPrice)}</Text>

        <View className="flex-row items-center justify-between mt-xs">
          <View className="flex-row items-center border border-graytone-300 rounded-md">
            <Pressable
              onPress={() => changeQuantity(item.quantity - moq)}
              disabled={item.quantity - moq < moq}
              className="w-9 h-9 items-center justify-center"
            >
              <Feather name="minus" size={16} color={item.quantity - moq < moq ? '#CBCBCB' : '#0A0A0A'} />
            </Pressable>
            <Text className="w-8 text-center text-[14px] font-semibold text-black">{item.quantity}</Text>
            <Pressable onPress={() => changeQuantity(item.quantity + moq)} className="w-9 h-9 items-center justify-center">
              <Feather name="plus" size={16} color="#0A0A0A" />
            </Pressable>
          </View>

          <View className="flex-row gap-lg">
            <Pressable onPress={moveToWishlist} hitSlop={8}>
              <Feather name="heart" size={18} color="#525252" />
            </Pressable>
            <Pressable onPress={() => removeItem.mutate(item.id)} hitSlop={8}>
              <Feather name="trash-2" size={18} color="#C11E1E" />
            </Pressable>
          </View>
        </View>
        {moq > 1 && <Text className="text-[11px] text-graytone-400">Sold in multiples of {moq}</Text>}
      </View>
    </View>
  );
});

export default function CartScreen() {
  const { data: cart, isLoading, isError, error, refetch } = useCart();
  const items = cart?.items ?? [];

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
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        {Array.from({ length: 4 }).map((_, i) => (
          <ListRowSkeleton key={i} />
        ))}
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <ErrorState error={error} onRetry={refetch} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="px-lg pt-sm pb-lg">
        <Text className="text-h2 font-bold text-black">Cart</Text>
      </View>

      {items.length === 0 ? (
        <EmptyState
          icon="shopping-cart"
          title="Your cart is empty"
          message="Browse the catalog and add parts to get started."
          actionLabel="Browse products"
          onAction={() => router.push('/(tabs)')}
        />
      ) : (
        <>
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <CartRow item={item} />}
            contentContainerClassName="pb-lg"
          />

          <View className="border-t border-graytone-200 px-lg pt-lg pb-sm gap-sm">
            <View className="flex-row justify-between">
              <Text className="text-[14px] text-graytone-600">Subtotal</Text>
              <Text className="text-[14px] text-black">{formatCurrency(totals.subtotal)}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-[14px] text-graytone-600">GST</Text>
              <Text className="text-[14px] text-black">{formatCurrency(totals.gstAmount)}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-[14px] text-graytone-600">Shipping</Text>
              <Text className="text-[14px] text-black">
                {totals.shipping === 0 ? 'Free' : formatCurrency(totals.shipping)}
              </Text>
            </View>
            <View className="flex-row justify-between pt-sm border-t border-graytone-100">
              <Text className="text-[16px] font-bold text-black">Total</Text>
              <Text className="text-[16px] font-bold text-black">{formatCurrency(totals.grandTotal)}</Text>
            </View>
            <Text className="text-[11px] text-graytone-400">
              Final total is confirmed by the server when you place the order.
            </Text>

            <Button
              label="Proceed to checkout"
              fullWidth
              size="lg"
              onPress={() => {
                if (items.some((i) => i.product.stock <= 0)) {
                  Alert.alert('Some items are out of stock', 'Remove out-of-stock items before checking out.');
                  return;
                }
                router.push('/checkout');
              }}
            />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}
