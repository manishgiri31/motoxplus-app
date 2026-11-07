import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { useAuth } from '@/auth/useAuth';
import { canAccessDealerApp } from '@/auth/access';
import type { Product } from '@/api/types';
import { Image } from '@/components/ui';
import { useFocusRing } from '@/hooks/use-focus-ring';
import { isFewLeft, isOutOfStock } from '@/utils/stock';
import type { SelectedVehicle } from '@/stores/vehicleStore';
import { getImageSource } from '@/utils/image';
import { isCompatibleWithVehicle } from '@/utils/vehicleCompatibility';
import { colors, font, radii } from '@/src/theme';

import { StatusBadge } from '../ui/StatusBadge';
import { ProductPrice } from './ProductPrice';

export interface CatalogProductCardProps {
  product: Product;
  vehicle?: SelectedVehicle | null;
  // When true, skip the client-side compatibility heuristic and always show
  // the "fits" line — for screens whose product list is already
  // server-filtered by GET /api/products' real vehicle/variant params
  // (vehicle-parts.tsx), every result is guaranteed compatible already. The
  // heuristic remains the only signal on unfiltered lists (Search/Category).
  guaranteedFit?: boolean;
  // Kept for call sites: "Few left" is now always shown on the image.
  stockBadge?: boolean;
}

// Every text region below has a pinned (font-scale aware) height whether it is
// filled or not, so the tile is a deterministic height for a given column
// width — FlatList/FlashList never equalise row heights on their own, so
// without this the grid staggers. Dynamic Type is honoured up to 120%.
const MAX_FONT_SCALE = 1.2;
const NAME_LINES = 2;
const NAME_LINE_HEIGHT = 20;

// Marketplace-style tile: white card with a hairline border (works on white
// and grey pages), photo on top with a stock tag, then name, part number,
// price with MRP and saving, and the minimum order.
export function CatalogProductCard({ product, vehicle = null, guaranteedFit = false }: CatalogProductCardProps) {
  const { user, dealer } = useAuth();
  const focusRing = useFocusRing();
  const { fontScale } = useWindowDimensions();
  const scale = Math.min(Math.max(fontScale, 1), MAX_FONT_SCALE);
  const isDealerApproved = canAccessDealerApp(user, dealer);
  const primaryImage = product.productImages?.find((i) => i.isPrimary) ?? product.productImages?.[0];
  const fits = guaranteedFit || isCompatibleWithVehicle(product, vehicle);
  const outOfStock = isOutOfStock(product);
  const lowStock = !outOfStock && isFewLeft(product);

  const footer = fits && vehicle ? { text: 'Fits your bike', color: colors.success } : product.moq > 1 ? { text: `Min. order ${product.moq}`, color: colors.ink2 } : null;

  const label = [
    product.name,
    outOfStock ? 'Out of stock' : lowStock ? 'Few left' : null,
    `Part number ${product.partNumber}`,
    fits && vehicle ? 'Fits your bike' : null,
    product.moq > 1 ? `Minimum order ${product.moq}` : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Pressable
      onPress={() => router.push(`/product/${product.id}`)}
      onFocus={focusRing.onFocus}
      onBlur={focusRing.onBlur}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.card, pressed && styles.pressed, focusRing.ringStyle]}
    >
      <View style={styles.imageWrap}>
        {/* contain (not cover) — spare-part photos come in wildly different
            dimensions and cover would crop/stretch them. The missing-image
            placeholder renders into this same box, so the tile doesn't jump
            when an image loads in. */}
        <Image
          source={getImageSource(primaryImage?.imageUrl)}
          style={[styles.image, outOfStock && styles.imageDimmed]}
          contentFit="contain"
          cachePolicy="memory-disk"
        />
        {(outOfStock || lowStock) && (
          <View style={styles.badge}>
            <StatusBadge label={outOfStock ? 'Out of stock' : 'Few left'} tone={outOfStock ? 'danger' : 'warning'} />
          </View>
        )}
      </View>

      <View style={styles.body}>
        <Text style={[styles.name, { height: NAME_LINES * NAME_LINE_HEIGHT * scale }]} numberOfLines={NAME_LINES} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {product.name}
        </Text>
        <Text style={[styles.part, { height: 16 * scale }]} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {product.partNumber}
        </Text>
        <View style={styles.price}>
          <ProductPrice price={product.price} mrp={product.mrp} isDealerApproved={isDealerApproved} scale={scale} />
        </View>
        <Text
          style={[styles.footer, { height: 16 * scale }, footer && { color: footer.color }]}
          numberOfLines={1}
          maxFontSizeMultiplier={MAX_FONT_SCALE}
        >
          {footer?.text ?? ' '}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  pressed: { opacity: 0.7 },
  imageWrap: { width: '100%', aspectRatio: 1, backgroundColor: colors.white, padding: 12 },
  image: { width: '100%', height: '100%' },
  imageDimmed: { opacity: 0.45 },
  badge: { position: 'absolute', top: 8, left: 8 },
  body: { paddingHorizontal: 10, paddingTop: 2, paddingBottom: 10, gap: 2 },
  name: { ...font(400), fontSize: 15, lineHeight: NAME_LINE_HEIGHT, letterSpacing: -0.2, color: colors.ink },
  part: { ...font(400), fontSize: 12, lineHeight: 16, color: colors.ink3, fontVariant: ['tabular-nums'] },
  price: { marginTop: 4 },
  footer: { ...font(600), fontSize: 12, lineHeight: 16, color: colors.ink2 },
});
