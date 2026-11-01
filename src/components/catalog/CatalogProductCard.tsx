import { router } from 'expo-router';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { useAuth } from '@/auth/useAuth';
import { canAccessDealerApp } from '@/auth/access';
import type { Product } from '@/api/types';
import { Image } from '@/components/ui';
import { isFewLeft, isOutOfStock } from '@/utils/stock';
import type { SelectedVehicle } from '@/stores/vehicleStore';
import { getImageSource } from '@/utils/image';
import { isCompatibleWithVehicle } from '@/utils/vehicleCompatibility';

import { BlurredPrice } from '../ui/BlurredPrice';
import { Card } from '../ui/Card';
import { colors, font, textStyles } from '@/src/theme';
import { StatusBadge } from '../ui/StatusBadge';

export interface CatalogProductCardProps {
  product: Product;
  vehicle?: SelectedVehicle | null;
  // When true, skip the client-side compatibility heuristic and always show
  // the "fits" eyebrow — for screens whose product list is already
  // server-filtered by GET /api/products' real vehicle/variant params
  // (vehicle-parts.tsx), every result is guaranteed compatible already. The
  // heuristic remains the only signal on unfiltered lists (Search/Category).
  guaranteedFit?: boolean;
  // Show "Few left" as a warning badge over the image (home Low Stock rail)
  // instead of as the eyebrow line.
  stockBadge?: boolean;
}

// Each text region below has a pinned (font-scale aware) height whether it is
// filled or not, so the whole tile is a deterministic height for a given column
// width — FlatList/FlashList never equalise row heights on their own, so
// without this the grid staggers. Dynamic Type is honoured up to 120%.
const MAX_FONT_SCALE = 1.2;
const NAME_LINES = 2;

export function CatalogProductCard({ product, vehicle = null, guaranteedFit = false, stockBadge = false }: CatalogProductCardProps) {
  const { user, dealer } = useAuth();
  const { fontScale } = useWindowDimensions();
  const scale = Math.min(Math.max(fontScale, 1), MAX_FONT_SCALE);
  const isDealerApproved = canAccessDealerApp(user, dealer);
  const primaryImage = product.productImages?.find((i) => i.isPrimary) ?? product.productImages?.[0];
  const fits = guaranteedFit || isCompatibleWithVehicle(product, vehicle);
  const outOfStock = isOutOfStock(product);
  const lowStock = !outOfStock && isFewLeft(product);

  // One eyebrow line above the name carries the most important status: stock
  // first, then vehicle fit.
  const eyebrow = outOfStock
    ? { text: 'Out of stock', color: colors.ink3 }
    : lowStock && !stockBadge
      ? { text: 'Few left', color: colors.warning }
      : fits && vehicle
        ? { text: 'Fits your bike', color: colors.accent }
        : null;

  const partLabel = `Part number ${product.partNumber}`;
  const label = [product.name, eyebrow?.text ?? (lowStock ? 'Few left' : null), partLabel, product.moq > 1 ? `Minimum order ${product.moq}` : null]
    .filter(Boolean)
    .join(', ');

  return (
    <Card onPress={() => router.push(`/product/${product.id}`)} accessibilityLabel={label} style={styles.card}>
      <View style={styles.imageWrap}>
        {/* contain (not cover) — spare-part photos come in wildly different
            dimensions and cover would crop/stretch them. The missing-image
            placeholder renders into this same box, so the tile doesn't jump
            when an image loads in. */}
        <Image source={getImageSource(primaryImage?.imageUrl)} style={styles.image} contentFit="contain" cachePolicy="memory-disk" />
        {stockBadge && lowStock && (
          <View style={styles.badge}>
            <StatusBadge label="Few left" tone="warning" />
          </View>
        )}
      </View>

      <View style={styles.body}>
        <Text
          style={[styles.eyebrow, { minHeight: 16 * scale }, eyebrow && { color: eyebrow.color }]}
          numberOfLines={1}
          maxFontSizeMultiplier={MAX_FONT_SCALE}
        >
          {eyebrow?.text ?? ' '}
        </Text>
        <Text style={[styles.name, { height: NAME_LINES * 22 * scale }]} numberOfLines={NAME_LINES} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {product.name}
        </Text>
        <Text style={[styles.part, { minHeight: 16 * scale }]} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {product.partNumber}
        </Text>
        <View style={[styles.priceRow, { minHeight: 22 * scale }]}>
          <BlurredPrice price={product.price} isDealerApproved={isDealerApproved} compact />
        </View>
        <Text style={[styles.moq, { minHeight: 16 * scale }]} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {product.moq > 1 ? `Min. ${product.moq}` : ' '}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  // Zero padding: the white image block runs edge to edge across the top of the
  // card and the card's own 18pt corners (overflow hidden) round it.
  card: { flex: 1, padding: 0, overflow: 'hidden' },
  imageWrap: { width: '100%', aspectRatio: 1, backgroundColor: colors.white, padding: 12 },
  image: { width: '100%', height: '100%' },
  badge: { position: 'absolute', top: 8, left: 8 },
  body: { flex: 1, padding: 12, gap: 2 },
  eyebrow: { ...textStyles.caption, ...font(600) },
  name: { ...textStyles.headline },
  part: { ...textStyles.caption, marginTop: 2 },
  priceRow: { justifyContent: 'center', marginTop: 6 },
  moq: { ...textStyles.caption },
});
