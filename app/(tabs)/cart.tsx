import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAddToCart, useCart, useRemoveCartItem } from '@/api/hooks/useCart';
import { useDealerSummary } from '@/api/hooks/useDealerSummary';
import type { CartItem } from '@/api/types';
import { useAuth } from '@/auth/useAuth';
import { ShoppingBag } from '@/components/icons/ShoppingBag';
import { iconSizes } from '@/components/icons/iconSizes';
import { CartLine, CART_LINE_TEXT_INSET, FreeLine } from '@/src/components/cart/CartLine';
import { CartSkeleton } from '@/src/components/cart/CartSkeleton';
import { FreeDeliveryCard } from '@/src/components/cart/FreeDeliveryCard';
import { OutOfStockSheet } from '@/src/components/cart/OutOfStockSheet';
import { SchemeBenefitCard } from '@/src/components/cart/SchemeBenefitCard';
import { useRemoveFreeItem } from '@/src/components/cart/useRemoveFreeItem';
import { CheckoutBottomBar } from '@/src/components/checkout/CheckoutBottomBar';
import { PincodeServiceability } from '@/src/components/checkout/PincodeServiceability';
import { SummaryRow } from '@/src/components/checkout/SummaryRow';
import {
  Button,
  EmptyState,
  GroupedList,
  InputField,
  LargeTitleHeader,
  CompactTitleBar,
  Toast,
  useLargeTitleScroll,
} from '@/src/components/ui';
import { colors, font, layout, screenPaddingX, sectionGap, space } from '@/src/theme';
import { calculateCartTotals, splitCartItems } from '@/utils/cartTotals';
import { formatCurrency } from '@/utils/format';
import { HapticService } from '@/utils/haptics';
import { isOutOfStock } from '@/utils/stock';

const TITLE = 'Cart';
// Toast sits this far above the sticky checkout bar.
const TOAST_GAP = space.md;
// How long the "Removed … Undo" toast stays up.
const UNDO_MS = 4000;

type CartListLine = { kind: 'item'; item: CartItem } | { kind: 'free'; item: CartItem };

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const { dealer } = useAuth();
  const { data: cart, isLoading, isError, error, refetch, isRefetching } = useCart();
  const { summary: dealerSummary } = useDealerSummary();
  // GST Benefit free items are shown as FREE lines, never counted as payable.
  const { regularItems: items, schemeItems } = useMemo(() => splitCartItems(cart?.items ?? []), [cart]);
  const addToCart = useAddToCart();
  const removeItem = useRemoveCartItem();
  const { scrollY, onScroll } = useLargeTitleScroll();

  const [removed, setRemoved] = useState<{ id: number; items: CartItem[] } | null>(null);
  const [deliveryPincode, setDeliveryPincode] = useState('');
  const [schemeMessage, setSchemeMessage] = useState<string | null>(null);
  const [barHeight, setBarHeight] = useState(0);
  const [stockSheet, setStockSheet] = useState<{ visible: boolean; items: CartItem[] }>({ visible: false, items: [] });

  const { remove: removeFreeItem, removingId } = useRemoveFreeItem(cart?.schemeId, schemeItems, setSchemeMessage);

  const lines = useMemo<CartListLine[]>(
    () => [
      ...items.map((item) => ({ kind: 'item' as const, item })),
      ...schemeItems.map((item) => ({ kind: 'free' as const, item })),
    ],
    [items, schemeItems]
  );

  const totals = useMemo(() => calculateCartTotals(cart?.items ?? []), [cart]);
  const taxedTotal = totals.subtotal + totals.gstAmount;
  const hasItems = items.length > 0;

  const onRefresh = () => {
    HapticService.light();
    refetch();
  };

  const removeLines = (toRemove: CartItem[]) => {
    setRemoved({ id: Date.now(), items: toRemove });
    toRemove.forEach((line) => removeItem.mutate(line.id));
  };

  const handleUndo = () => {
    if (!removed) return;
    HapticService.light();
    removed.items.forEach((line) =>
      addToCart.mutate({
        payload: { productId: line.productId, quantity: line.quantity, variantId: line.variantId ?? undefined },
        product: line.product,
        variant: line.variant ?? undefined,
      })
    );
    setRemoved(null);
  };

  const handleCheckout = () => {
    const unavailable = items.filter((i) => isOutOfStock(i.product));
    if (unavailable.length > 0) {
      HapticService.error();
      setStockSheet({ visible: true, items: unavailable });
      return;
    }
    router.push('/checkout');
  };

  const topPadding = insets.top + space.sm;

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <ScrollView scrollEnabled={false} contentContainerStyle={{ paddingTop: topPadding }}>
          <LargeTitleHeader title={TITLE} />
          <View style={styles.titleGap} />
          <CartSkeleton />
        </ScrollView>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.screen}>
        <View style={{ paddingTop: topPadding }}>
          <LargeTitleHeader title={TITLE} />
        </View>
        <EmptyState
          icon="alert-circle"
          title="Couldn't load your cart"
          message={error instanceof Error ? error.message : 'Please try again.'}
          actionLabel="Try again"
          onAction={() => refetch()}
        />
      </View>
    );
  }

  const creditLine =
    dealer && dealer.creditLimit > 0
      ? `Available credit: ${formatCurrency(Math.max(0, dealer.creditLimit - dealerSummary.outstandingBalance))}`
      : null;
  const summaryFootnote = [
    creditLine,
    schemeItems.length > 0 ? 'Free items are not included in the total.' : null,
    'Final total is confirmed by the server when you place the order.',
  ]
    .filter(Boolean)
    .join('\n');

  return (
    <View style={styles.screen}>
      <Animated.FlatList
        data={lines}
        keyExtractor={(line) => line.item.id}
        renderItem={({ item: line }) =>
          line.kind === 'item' ? (
            <CartLine item={line.item} onRemove={(it) => removeLines([it])} />
          ) : (
            <FreeLine item={line.item} onRemove={removeFreeItem} removing={removingId === line.item.id} />
          )
        }
        ItemSeparatorComponent={Separator}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{
          paddingTop: topPadding,
          paddingBottom: hasItems ? barHeight + sectionGap : sectionGap,
        }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            tintColor={colors.ink3}
            colors={[colors.ink3]}
            progressViewOffset={insets.top}
          />
        }
        ListHeaderComponent={
          <View>
            <LargeTitleHeader title={TITLE} scrollY={scrollY} />
            {hasItems && (
              <View style={styles.cards}>
                <SchemeBenefitCard
                  regularSubtotal={totals.subtotal}
                  appliedSchemeId={cart?.schemeId}
                  schemeItems={schemeItems}
                  clearedReason={
                    cart?.schemeCleared
                      ? (cart.schemeClearedReason ?? 'Your GST Benefit selection was no longer valid and was removed.')
                      : null
                  }
                  onNotify={setSchemeMessage}
                />
                <FreeDeliveryCard taxedTotal={taxedTotal} />
              </View>
            )}
            {hasItems && <View style={styles.listGap} />}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            iconElement={<ShoppingBag size={iconSizes.hero} color={colors.ink3} />}
            title="Your cart is empty"
            actionLabel="Browse products"
            onAction={() => router.push('/(tabs)')}
            style={styles.empty}
          />
        }
        ListFooterComponent={
          hasItems ? (
            <View style={styles.footerBlock}>
              <GroupedList footer={summaryFootnote}>
                <SummaryRow label="Subtotal" value={formatCurrency(totals.subtotal)} />
                <SummaryRow label="GST" value={formatCurrency(totals.gstAmount)} />
                <SummaryRow
                  label="Shipping"
                  value={totals.shipping === 0 ? 'Free' : formatCurrency(totals.shipping)}
                  tone={totals.shipping === 0 ? 'success' : 'default'}
                />
                <SummaryRow label="Total" value={formatCurrency(totals.grandTotal)} strong />
              </GroupedList>

              <View style={styles.pincode}>
                <InputField
                  label="Check delivery pincode"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={deliveryPincode}
                  onChangeText={(t) => setDeliveryPincode(t.replace(/\D/g, '').slice(0, 6))}
                />
                <PincodeServiceability pincode={deliveryPincode} />
              </View>
            </View>
          ) : null
        }
      />

      {hasItems && (
        <CheckoutBottomBar aboveTabBar onHeightChange={setBarHeight}>
          <View style={styles.totalRow} accessible accessibilityLabel={`Total, ${formatCurrency(totals.grandTotal)}`}>
            <Text style={styles.totalLabel} maxFontSizeMultiplier={layout.maxFontScale}>
              Total
            </Text>
            <Text style={styles.totalValue} maxFontSizeMultiplier={layout.maxFontScale}>
              {formatCurrency(totals.grandTotal)}
            </Text>
          </View>
          <Button label="Proceed to checkout" variant="primary" fullWidth onPress={handleCheckout} />
        </CheckoutBottomBar>
      )}

      <CompactTitleBar title={TITLE} scrollY={scrollY} />

      <OutOfStockSheet
        visible={stockSheet.visible}
        items={stockSheet.items}
        onClose={() => setStockSheet((s) => ({ ...s, visible: false }))}
        onRemoveAll={() => {
          HapticService.medium();
          removeLines(stockSheet.items);
          setStockSheet((s) => ({ ...s, visible: false }));
        }}
      />

      {schemeMessage && (
        <Toast
          message={schemeMessage}
          onHide={() => setSchemeMessage(null)}
          bottomOffset={hasItems ? barHeight + TOAST_GAP : undefined}
        />
      )}

      {removed && (
        <Toast
          key={removed.id}
          message={removed.items.length === 1 ? `Removed ${removed.items[0].product.name}` : `Removed ${removed.items.length} items`}
          action={{ label: 'Undo', onPress: handleUndo }}
          durationMs={UNDO_MS}
          onHide={() => setRemoved(null)}
          bottomOffset={hasItems ? barHeight + TOAST_GAP : undefined}
        />
      )}
    </View>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  titleGap: { height: space.xl },
  cards: { paddingHorizontal: screenPaddingX, marginTop: space.xl, gap: space.sm },
  listGap: { height: space.md },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: CART_LINE_TEXT_INSET,
    backgroundColor: colors.line,
  },
  empty: { flex: 0, paddingTop: 96 },
  footerBlock: { paddingHorizontal: screenPaddingX, marginTop: sectionGap, gap: sectionGap },
  pincode: { gap: space.sm },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  totalLabel: { ...font(400), fontSize: 17, lineHeight: 22, letterSpacing: -0.34, color: colors.ink2 },
  totalValue: {
    ...font(600),
    fontSize: 21,
    lineHeight: 25,
    letterSpacing: -0.42,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
});
