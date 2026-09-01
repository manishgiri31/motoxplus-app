import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { memo, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import Animated, { FadeIn, SlideOutRight } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAddToCart, useCart, useRemoveCartItem } from '@/api/hooks/useCart';
import { useDealerSummary } from '@/api/hooks/useDealerSummary';
import { useProduct } from '@/api/hooks/useProducts';
import type { CartItem } from '@/api/types';
import { useAuth } from '@/auth/useAuth';
import { Image, Input } from '@/components/ui';
import { PincodeServiceability } from '@/src/components/checkout/PincodeServiceability';
import { Button, Stepper, Toast } from '@/src/components/ui';
import { colors, fonts, radii } from '@/src/theme';
import { useWishlistStore } from '@/stores/wishlistStore';
import { calculateCartTotals, FREE_DELIVERY_THRESHOLD } from '@/utils/cartTotals';
import { formatCurrency } from '@/utils/format';
import { HapticService } from '@/utils/haptics';
import { getImageSource } from '@/utils/image';

const CartRow = memo(function CartRow({ item, onRemove }: { item: CartItem; onRemove: (item: CartItem) => void }) {
  const addToCart = useAddToCart();
  const toggleWishlist = useWishlistStore((s) => s.toggle);

  const unitPrice = item.variant?.price ?? item.product.price;
  const moq = item.product.moq;
  // Unlike GET /api/products[/:id], GET /api/cart's embedded product does not
  // include productImages (see docs/api.md §6) — only category is promised.
  // The optimistic item added by useAddToCart carries the full Product (with
  // images) from wherever it was added, but once the cart is invalidated and
  // refetched from the server, that field is gone from every item. Fall back
  // to fetching the product itself (cheap — React Query cache means this is
  // usually already warm from browsing) so the row doesn't go blank on reload.
  const hasImages = (item.product.productImages?.length ?? 0) > 0;
  const fallbackProductQuery = useProduct(hasImages ? undefined : item.productId);
  const images = hasImages ? item.product.productImages : fallbackProductQuery.data?.productImages;
  const primaryImage = images?.find((i) => i.isPrimary) ?? images?.[0];

  const changeQuantity = (nextQuantity: number) => {
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
    onRemove(item);
  };

  return (
    <Swipeable
      renderRightActions={() => (
        <Pressable
          onPress={() => onRemove(item)}
          style={styles.swipeAction}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${item.product.name}`}
        >
          <Feather name="trash-2" size={20} color="#FFFFFF" />
        </Pressable>
      )}
      overshootRight={false}
    >
      <Animated.View exiting={SlideOutRight.duration(200)} style={styles.row}>
        <Image source={getImageSource(primaryImage?.imageUrl)} style={styles.image} cachePolicy="memory-disk" recyclingKey={item.productId} />
        <View style={styles.rowContent}>
          <Text style={styles.name} numberOfLines={2}>
            {item.product.name}
          </Text>
          {item.variant && <Text style={styles.variant}>{item.variant.label}</Text>}
          <Text style={styles.price}>{formatCurrency(unitPrice)}</Text>

          <View style={styles.rowFooter}>
            <Stepper value={item.quantity} moq={moq} onChange={changeQuantity} />
            <View style={styles.rowActions}>
              <Pressable onPress={moveToWishlist} hitSlop={13} accessibilityRole="button" accessibilityLabel="Move to wishlist">
                <Feather name="heart" size={18} color={colors.muted} />
              </Pressable>
              <Pressable
                onPress={() => {
                  HapticService.medium();
                  onRemove(item);
                }}
                hitSlop={13}
                accessibilityRole="button"
                accessibilityLabel="Remove item"
              >
                <Feather name="trash-2" size={18} color={colors.red} />
              </Pressable>
            </View>
          </View>
          {moq > 1 && <Text style={styles.moqNote}>Sold in multiples of {moq}</Text>}
        </View>
      </Animated.View>
    </Swipeable>
  );
});

export default function CartScreen() {
  const { dealer } = useAuth();
  const { data: cart, isLoading, isError, error, refetch, isRefetching } = useCart();
  const { summary: dealerSummary } = useDealerSummary();
  const items = cart?.items ?? [];
  const addToCart = useAddToCart();
  const removeItem = useRemoveCartItem();
  const [lastRemoved, setLastRemoved] = useState<CartItem | null>(null);
  const [deliveryPincode, setDeliveryPincode] = useState('');

  const onRefresh = () => {
    HapticService.light();
    refetch();
  };

  const totals = useMemo(() => calculateCartTotals(cart?.items ?? []), [cart]);
  const taxedTotal = totals.subtotal + totals.gstAmount;
  const qualifiesForFreeDelivery = taxedTotal >= FREE_DELIVERY_THRESHOLD;
  const remainingForFreeDelivery = Math.max(0, FREE_DELIVERY_THRESHOLD - taxedTotal);
  const freeDeliveryProgress = Math.min(100, (taxedTotal / FREE_DELIVERY_THRESHOLD) * 100);

  const handleRemove = (item: CartItem) => {
    setLastRemoved(item);
    removeItem.mutate(item.id);
  };

  const handleUndo = () => {
    if (!lastRemoved) return;
    HapticService.light();
    addToCart.mutate({
      payload: {
        productId: lastRemoved.productId,
        quantity: lastRemoved.quantity,
        variantId: lastRemoved.variantId ?? undefined,
      },
      product: lastRemoved.product,
      variant: lastRemoved.variant ?? undefined,
    });
    setLastRemoved(null);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <ActivityFallback />
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Couldn&apos;t load your cart</Text>
          <Text style={styles.emptyMessage}>{error instanceof Error ? error.message : 'Please try again.'}</Text>
          <Button label="Retry" variant="ghost" onPress={() => refetch()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Animated.View entering={FadeIn.duration(200)} style={styles.header}>
        <Text style={styles.title}>Cart</Text>
      </Animated.View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <CartRow item={item} onRemove={handleRemove} />}
        contentContainerStyle={items.length === 0 ? styles.emptyContent : styles.listContent}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.red} colors={[colors.red]} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Your cart is empty</Text>
            <Text style={styles.emptyMessage}>Browse the catalog and add parts to get started.</Text>
            <Button label="Browse products" variant="ghost" onPress={() => router.push('/(tabs)')} />
          </View>
        }
      />

      {items.length > 0 && (
        <View style={styles.freeDeliveryCard}>
          {qualifiesForFreeDelivery ? (
            <View style={styles.freeDeliveryRow}>
              <Feather name="check-circle" size={14} color={colors.red} />
              <Text style={styles.freeDeliveryText}>You&apos;ve unlocked free delivery</Text>
            </View>
          ) : (
            <>
              <Text style={styles.freeDeliveryText}>
                Add {formatCurrency(remainingForFreeDelivery)} more for free delivery
              </Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${freeDeliveryProgress}%` }]} />
              </View>
            </>
          )}
        </View>
      )}

      {items.length > 0 && (
        <View style={styles.summary}>
          <SummaryRow label="Subtotal" value={formatCurrency(totals.subtotal)} />
          <SummaryRow label="GST" value={formatCurrency(totals.gstAmount)} />
          <SummaryRow label="Shipping" value={totals.shipping === 0 ? 'Free' : formatCurrency(totals.shipping)} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatCurrency(totals.grandTotal)}</Text>
          </View>
          {dealer && dealer.creditLimit > 0 && (
            <SummaryRow
              label="Available credit"
              value={formatCurrency(Math.max(0, dealer.creditLimit - dealerSummary.outstandingBalance))}
            />
          )}

          <View style={styles.pincodeBlock}>
            <Input
              label="Check delivery pincode"
              keyboardType="number-pad"
              maxLength={6}
              value={deliveryPincode}
              onChangeText={(t) => setDeliveryPincode(t.replace(/\D/g, '').slice(0, 6))}
            />
            <PincodeServiceability pincode={deliveryPincode} />
          </View>

          <Text style={styles.disclaimer}>Final total is confirmed by the server when you place the order.</Text>

          <Button
            label="Proceed to checkout"
            variant="brand"
            fullWidth
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

      {lastRemoved && (
        <Toast
          message={`Removed ${lastRemoved.product.name}`}
          action={{ label: 'Undo', onPress: handleUndo }}
          onHide={() => setLastRemoved(null)}
        />
      )}
    </SafeAreaView>
  );
}

function ActivityFallback() {
  return (
    <View style={styles.emptyContent}>
      {Array.from({ length: 4 }).map((_, i) => (
        <View key={i} style={styles.skeletonRow} />
      ))}
    </View>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  title: { fontFamily: fonts.display.extraBold, fontSize: 24, color: colors.ink },
  listContent: { paddingBottom: 16 },
  emptyContent: { flexGrow: 1 },
  skeletonRow: { height: 96, backgroundColor: colors.line, opacity: 0.4, margin: 8, borderRadius: radii.md },
  row: { flexDirection: 'row', gap: 12, padding: 16, backgroundColor: colors.paper, borderBottomWidth: 1, borderBottomColor: colors.line },
  image: { width: 64, height: 64, borderRadius: radii.sm, backgroundColor: colors.card },
  rowContent: { flex: 1, gap: 4 },
  name: { fontFamily: fonts.body.semiBold, fontSize: 14, color: colors.ink },
  variant: { fontFamily: fonts.body.regular, fontSize: 12, color: colors.muted },
  price: { fontFamily: fonts.display.bold, fontSize: 15, color: colors.ink },
  rowFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  rowActions: { flexDirection: 'row', gap: 16 },
  moqNote: { fontFamily: fonts.body.regular, fontSize: 11, color: colors.muted },
  swipeAction: {
    width: 72,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  freeDeliveryCard: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: radii.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 8,
  },
  freeDeliveryRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  freeDeliveryText: { fontFamily: fonts.body.medium, fontSize: 12.5, color: colors.ink },
  progressTrack: { height: 6, borderRadius: radii.pill, backgroundColor: colors.line, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: radii.pill, backgroundColor: colors.red },
  summary: { borderTopWidth: 1, borderTopColor: colors.line, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, gap: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontFamily: fonts.body.regular, fontSize: 14, color: colors.muted },
  summaryValue: { fontFamily: fonts.body.regular, fontSize: 14, color: colors.ink },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  totalLabel: { fontFamily: fonts.display.bold, fontSize: 16, color: colors.ink },
  totalValue: { fontFamily: fonts.display.bold, fontSize: 16, color: colors.ink },
  disclaimer: { fontFamily: fonts.body.regular, fontSize: 11, color: colors.muted },
  pincodeBlock: { gap: 8, paddingTop: 4 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 8 },
  emptyTitle: { fontFamily: fonts.display.bold, fontSize: 17, color: colors.ink },
  emptyMessage: { fontFamily: fonts.body.regular, fontSize: 14, color: colors.muted, textAlign: 'center', marginBottom: 8 },
});
