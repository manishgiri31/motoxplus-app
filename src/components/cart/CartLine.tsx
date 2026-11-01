import { Feather } from '@expo/vector-icons';
import { memo, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import Animated, { FadeOut } from 'react-native-reanimated';

import { useAddToCart } from '@/api/hooks/useCart';
import { useProduct } from '@/api/hooks/useProducts';
import type { CartItem } from '@/api/types';
import { Trash2 } from '@/components/icons/Trash2';
import { TriangleAlert } from '@/components/icons/TriangleAlert';
import { iconSizes } from '@/components/icons/iconSizes';
import { Image } from '@/components/ui';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { Button, Stepper } from '@/src/components/ui';
import { colors, font, layout, motion, radii, screenPaddingX, space } from '@/src/theme';
import { useWishlistStore } from '@/stores/wishlistStore';
import { formatCurrency } from '@/utils/format';
import { HapticService } from '@/utils/haptics';
import { getImageSource } from '@/utils/image';
import { isOutOfStock } from '@/utils/stock';

const THUMB = 64;
// Left edge of the text column: row padding + thumbnail + gap. Separators between
// lines start here, like iOS list separators.
export const CART_LINE_TEXT_INSET = screenPaddingX + THUMB + space.md;

// Unlike GET /api/products[/:id], GET /api/cart's embedded product does not
// include productImages (see docs/api.md §6) — only category is promised.
// The optimistic item added by useAddToCart carries the full Product (with
// images) from wherever it was added, but once the cart is invalidated and
// refetched from the server, that field is gone from every item. Fall back
// to fetching the product itself (cheap — React Query cache means this is
// usually already warm from browsing) so the row doesn't go blank on reload.
function useCartImage(item: CartItem) {
  const hasImages = (item.product.productImages?.length ?? 0) > 0;
  const fallbackProductQuery = useProduct(hasImages ? undefined : item.productId);
  const images = hasImages ? item.product.productImages : fallbackProductQuery.data?.productImages;
  return images?.find((i) => i.isPrimary) ?? images?.[0];
}

function Thumb({ item, imageUrl }: { item: CartItem; imageUrl: string | undefined }) {
  return (
    <Image
      source={getImageSource(imageUrl)}
      style={styles.thumb}
      cachePolicy="memory-disk"
      recyclingKey={item.productId}
      accessibilityIgnoresInvertColors
    />
  );
}

export interface CartLineProps {
  item: CartItem;
  onRemove: (item: CartItem) => void;
}

// A paid cart line: 64pt thumbnail, name / variant / price, quantity stepper
// below. Swipe left to reveal a red Delete action.
export const CartLine = memo(function CartLine({ item, onRemove }: CartLineProps) {
  const addToCart = useAddToCart();
  const toggleWishlist = useWishlistStore((s) => s.toggle);
  const reduceMotion = useReduceMotion();
  const swipeable = useRef<Swipeable>(null);

  const unitPrice = item.variant?.price ?? item.product.price;
  const moq = item.product.moq;
  const outOfStock = isOutOfStock(item.product);
  const primaryImage = useCartImage(item);

  const changeQuantity = (nextQuantity: number) => {
    addToCart.mutate({
      payload: { productId: item.productId, quantity: nextQuantity, variantId: item.variantId ?? undefined },
      product: item.product,
      variant: item.variant ?? undefined,
    });
  };

  const remove = () => {
    HapticService.medium();
    swipeable.current?.close();
    onRemove(item);
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
      ref={swipeable}
      overshootRight={false}
      renderRightActions={() => (
        <Pressable
          onPress={remove}
          style={({ pressed }) => [styles.deleteAction, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${item.product.name}`}
        >
          <Trash2 size={iconSizes.inList} color={colors.white} />
          <Text style={styles.deleteLabel} maxFontSizeMultiplier={layout.maxFontScale}>
            Delete
          </Text>
        </Pressable>
      )}
    >
      <Animated.View exiting={reduceMotion ? undefined : FadeOut.duration(motion.duration.fast)} style={styles.row}>
        <Thumb item={item} imageUrl={primaryImage?.imageUrl} />

        <View style={styles.main}>
          <View style={styles.topRow}>
            <View style={styles.titleCol}>
              <Text style={styles.name} numberOfLines={2} maxFontSizeMultiplier={layout.maxFontScale}>
                {item.product.name}
              </Text>
              {!!item.variant && (
                <Text style={styles.secondary} maxFontSizeMultiplier={layout.maxFontScale}>
                  {item.variant.label}
                </Text>
              )}
              {outOfStock && (
                <View style={styles.warningRow}>
                  <TriangleAlert size={16} color={colors.warning} />
                  <Text style={styles.warning} maxFontSizeMultiplier={layout.maxFontScale}>
                    Out of stock
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.priceCol}>
              <Text style={styles.price} maxFontSizeMultiplier={layout.maxFontScale}>
                {formatCurrency(unitPrice * item.quantity)}
              </Text>
              {item.quantity > 1 && (
                <Text style={styles.each} maxFontSizeMultiplier={layout.maxFontScale}>
                  {formatCurrency(unitPrice)} each
                </Text>
              )}
            </View>
          </View>

          <View style={styles.footer}>
            <Stepper value={item.quantity} moq={moq} onChange={changeQuantity} label={item.product.name} />
            <View style={styles.actions}>
              <IconAction icon="heart" label={`Move ${item.product.name} to wishlist`} onPress={moveToWishlist} />
              <IconAction icon="trash-2" label={`Remove ${item.product.name}`} onPress={remove} />
            </View>
          </View>

          {moq > 1 && (
            <Text style={styles.moqNote} maxFontSizeMultiplier={layout.maxFontScale}>
              Sold in multiples of {moq}
            </Text>
          )}
        </View>
      </Animated.View>
    </Swipeable>
  );
});

function IconAction({ icon, label, onPress }: { icon: 'heart' | 'trash-2'; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.iconAction, pressed && styles.pressed]}
    >
      <Feather name={icon} size={20} color={colors.ink2} />
    </Pressable>
  );
}

export interface FreeLineProps {
  item: CartItem;
  onRemove: (item: CartItem) => void;
  removing?: boolean;
}

// A GST Benefit free item: same shape as a paid line, but the quantity is fixed
// (shown as text), the price is struck through and FREE is in success green.
export const FreeLine = memo(function FreeLine({ item, onRemove, removing = false }: FreeLineProps) {
  const primaryImage = useCartImage(item);
  const price = item.variant?.price ?? item.product.price;

  return (
    <View style={styles.row}>
      <Thumb item={item} imageUrl={primaryImage?.imageUrl} />

      <View style={styles.main}>
        <View style={styles.topRow}>
          <View style={styles.titleCol}>
            <Text style={styles.name} numberOfLines={2} maxFontSizeMultiplier={layout.maxFontScale}>
              {item.product.name}
            </Text>
            {!!item.variant && (
              <Text style={styles.secondary} maxFontSizeMultiplier={layout.maxFontScale}>
                {item.variant.label}
              </Text>
            )}
            <Text style={styles.secondary} maxFontSizeMultiplier={layout.maxFontScale}>
              Qty {item.quantity}
            </Text>
          </View>
          <View style={styles.priceCol} accessible accessibilityLabel={`Free, worth ${formatCurrency(price * item.quantity)}`}>
            <Text style={styles.free} maxFontSizeMultiplier={layout.maxFontScale}>
              FREE
            </Text>
            <Text style={styles.struck} maxFontSizeMultiplier={layout.maxFontScale}>
              {formatCurrency(price * item.quantity)}
            </Text>
          </View>
        </View>

        <Button
          label="Remove"
          variant="link"
          hideChevron
          loading={removing}
          onPress={() => onRemove(item)}
          accessibilityLabel={`Remove free item ${item.product.name}`}
          style={styles.removeLink}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
    paddingHorizontal: screenPaddingX,
    paddingVertical: space.lg,
    backgroundColor: colors.bg,
  },
  thumb: { width: THUMB, height: THUMB, borderRadius: radii.sm, backgroundColor: colors.bgAlt },
  main: { flex: 1, gap: space.sm },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  titleCol: { flex: 1, gap: 2 },
  priceCol: { alignItems: 'flex-end', gap: 2 },
  name: { ...font(400), fontSize: 17, lineHeight: 22, letterSpacing: -0.34, color: colors.ink },
  secondary: { ...font(400), fontSize: 14, lineHeight: 20, color: colors.ink2 },
  warning: { ...font(600), fontSize: 14, lineHeight: 20, color: colors.warning },
  warningRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  price: { ...font(600), fontSize: 17, lineHeight: 22, letterSpacing: -0.34, color: colors.ink, fontVariant: ['tabular-nums'] },
  each: { ...font(400), fontSize: 12, lineHeight: 16, color: colors.ink3 },
  free: { ...font(600), fontSize: 17, lineHeight: 22, letterSpacing: -0.34, color: colors.success },
  struck: { ...font(400), fontSize: 14, lineHeight: 20, color: colors.ink3, textDecorationLine: 'line-through' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actions: { flexDirection: 'row', alignItems: 'center' },
  iconAction: { width: layout.minTouchTarget, height: layout.minTouchTarget, alignItems: 'center', justifyContent: 'center' },
  moqNote: { ...font(400), fontSize: 12, lineHeight: 16, color: colors.ink3 },
  removeLink: { alignSelf: 'flex-start', marginLeft: -8 },
  deleteAction: { width: 88, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center', gap: 4 },
  deleteLabel: { ...font(600), fontSize: 17, lineHeight: 22, letterSpacing: -0.34, color: colors.white },
  pressed: { opacity: 0.6 },
});
