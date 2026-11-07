import { router } from 'expo-router';
import { memo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { useAddToCart } from '@/api/hooks/useCart';
import { useProduct } from '@/api/hooks/useProducts';
import { Image } from '@/components/ui/Image';
import { FilledHeart } from '@/src/components/account/FilledHeart';
import { ProductPrice } from '@/src/components/catalog/ProductPrice';
import { alpha, colors, font, layout, motion, radii, space, textStyles } from '@/src/theme';
import { useWishlistStore, type WishlistItem } from '@/stores/wishlistStore';
import { HapticService } from '@/utils/haptics';
import { getImageSource } from '@/utils/image';
import { isOutOfStock } from '@/utils/stock';

export interface WishlistTileProps {
  item: WishlistItem;
  isDealerApproved: boolean;
  onNotify: (message: string) => void;
}

const NAME_LINES = 2;

// A saved product: image, filled heart (tap to remove), name, price and a small
// "Add to cart" pill. Live stock/MOQ comes from useProduct, as before.
export const WishlistTile = memo(function WishlistTile({ item, isDealerApproved, onNotify }: WishlistTileProps) {
  const remove = useWishlistStore((s) => s.remove);
  const productQuery = useProduct(item.productId);
  const addToCart = useAddToCart();
  const { fontScale } = useWindowDimensions();
  const scale = Math.min(Math.max(fontScale, 1), layout.maxFontScale);

  const product = productQuery.data;
  const soldOut = !!product && isOutOfStock(product);
  const addDisabled = !product || soldOut;

  const onAdd = () => {
    if (!product) return;
    HapticService.light();
    addToCart.mutate(
      { payload: { productId: item.productId, quantity: product.moq }, product },
      { onSuccess: () => onNotify('Added to cart') }
    );
  };

  return (
    // Plain View at the tile level: a Pressable ancestor would collapse the
    // subtree into one VoiceOver stop and hide the heart and Add buttons.
    <View style={styles.tile}>
      <View style={styles.imageWrap}>
        <Pressable
          onPress={() => router.push(`/product/${item.productId}`)}
          accessibilityRole="button"
          accessibilityLabel={item.name}
          style={({ pressed }) => [StyleSheet.absoluteFill, styles.imageLink, pressed && styles.pressed]}
        >
          <Image
            source={getImageSource(item.imageUrl)}
            style={styles.image}
            contentFit="contain"
            cachePolicy="memory-disk"
            recyclingKey={item.productId}
          />
        </Pressable>
        <Pressable
          onPress={() => {
            HapticService.medium();
            remove(item.productId);
            onNotify('Removed from wishlist');
          }}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${item.name} from wishlist`}
          style={({ pressed }) => [styles.heart, pressed && styles.pressed]}
        >
          <FilledHeart size={22} color={colors.ink} />
        </Pressable>
      </View>

      <View style={styles.body}>
        <Text style={[styles.brand, { minHeight: 16 * scale }]} numberOfLines={1} maxFontSizeMultiplier={layout.maxFontScale}>
          {item.brand || ' '}
        </Text>
        <Text style={[styles.name, { height: NAME_LINES * 22 * scale }]} numberOfLines={NAME_LINES} maxFontSizeMultiplier={layout.maxFontScale}>
          {item.name}
        </Text>
        <View style={styles.price}>
          <ProductPrice price={item.price} mrp={item.mrp} isDealerApproved={isDealerApproved} scale={scale} />
        </View>

        <Pressable
          onPress={onAdd}
          disabled={addDisabled || addToCart.isPending}
          // The pill is 36pt tall; slop brings the target to 44pt.
          hitSlop={{ top: 4, bottom: 4 }}
          accessibilityRole="button"
          accessibilityLabel={soldOut ? `${item.name} is out of stock` : `Add ${item.name} to cart`}
          accessibilityState={{ disabled: addDisabled, busy: addToCart.isPending }}
          style={({ pressed }) => [styles.add, addDisabled && styles.addDisabled, pressed && styles.addPressed]}
        >
          {addToCart.isPending ? (
            <ActivityIndicator size="small" color={colors.link} />
          ) : (
            <Text style={styles.addLabel} numberOfLines={1} maxFontSizeMultiplier={layout.maxFontScale}>
              {soldOut ? 'Out of stock' : 'Add to cart'}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  // Same white, hairline-bordered card as CatalogProductCard.
  tile: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  imageWrap: { width: '100%', aspectRatio: 1, backgroundColor: colors.white },
  imageLink: { padding: space.md },
  image: { width: '100%', height: '100%' },
  // 44pt target in the image corner.
  heart: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6 },
  body: { padding: space.md, gap: 2 },
  brand: { ...textStyles.caption },
  name: { ...textStyles.headline },
  price: { justifyContent: 'center', marginTop: space.xs, marginBottom: space.sm },
  // Small secondary pill: accent outline, link-colour text.
  add: {
    height: 36,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
  },
  addPressed: { transform: [{ scale: motion.pressScale }], backgroundColor: alpha(colors.accent, 0.08) },
  addDisabled: { opacity: 0.4 },
  addLabel: { ...font(600), fontSize: 14, lineHeight: 20, color: colors.link },
});
