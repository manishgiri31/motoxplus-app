import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

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
import { MonoLabel } from '../ui/MonoLabel';
import { colors, fonts } from '@/src/theme';

export interface CatalogProductCardProps {
  product: Product;
  vehicle?: SelectedVehicle | null;
  // When true, skip the client-side compatibility heuristic and always show
  // the "fits" badge — for screens whose product list is already
  // server-filtered by GET /api/products' real vehicle/variant params
  // (vehicle-parts.tsx), every result is guaranteed compatible already. The
  // heuristic remains the only signal on unfiltered lists (Search/Category).
  guaranteedFit?: boolean;
}

// The product name is clamped to exactly two lines AND pinned to that height
// (NAME_LINES * NAME_LINE_HEIGHT) whether the name is one line or two, so a
// short name doesn't make its card shorter than its neighbours. Every other
// region below is a fixed/aspect-ratio size too, which makes the whole card a
// deterministic height for a given column width — FlatList/FlashList never
// equalises row heights on its own, so without this the 2-col grid staggers.
const NAME_LINES = 2;
const NAME_LINE_HEIGHT = 18;

export function CatalogProductCard({ product, vehicle = null, guaranteedFit = false }: CatalogProductCardProps) {
  const { user, dealer } = useAuth();
  const isDealerApproved = canAccessDealerApp(user, dealer);
  const primaryImage = product.productImages?.find((i) => i.isPrimary) ?? product.productImages?.[0];
  const fits = guaranteedFit || isCompatibleWithVehicle(product, vehicle);
  const outOfStock = isOutOfStock(product);
  const lowStock = !outOfStock && isFewLeft(product);

  // One eyebrow line above the name carries the most important status: stock
  // first, then vehicle fit. It always reserves its height so cards stay equal.
  const eyebrow = outOfStock
    ? { text: 'Out of stock', color: colors.muted }
    : lowStock
      ? { text: 'Few left', color: colors.warning }
      : fits && vehicle
        ? { text: `Fits your ${vehicle.modelName}`, color: colors.success }
        : null;

  return (
    <Card onPress={() => router.push(`/product/${product.id}`)} accessibilityLabel={product.name} style={styles.card}>
      <View style={styles.imageWrap}>
        {/* contain (not cover) — spare-part photos come in wildly different
            dimensions and cover would crop/stretch them. The white tile behind
            the letterboxed image keeps the gap from reading as broken. The
            missing-image placeholder renders into this same box, so the
            card doesn't jump when an image loads in. */}
        <Image source={getImageSource(primaryImage?.imageUrl)} style={styles.image} contentFit="contain" cachePolicy="memory-disk" />
      </View>

      <View style={styles.body}>
        <Text style={[styles.eyebrow, eyebrow && { color: eyebrow.color }]} numberOfLines={1}>
          {eyebrow?.text ?? ' '}
        </Text>
        <Text style={styles.name} numberOfLines={NAME_LINES}>
          {product.name}
        </Text>
        <MonoLabel style={styles.part} numberOfLines={1}>
          {product.partNumber}
        </MonoLabel>
        <View style={styles.priceRow}>
          <BlurredPrice price={product.price} isDealerApproved={isDealerApproved} />
        </View>
        <Text style={styles.moq} numberOfLines={1}>
          {product.moq > 1 ? `MOQ ${product.moq}` : ' '}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, padding: 16 },
  imageWrap: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 14,
  },
  image: { width: '100%', height: '100%' },
  body: { flex: 1, alignItems: 'center' },
  eyebrow: {
    fontFamily: fonts.body.semiBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.12,
    color: colors.muted,
    textAlign: 'center',
    minHeight: 16,
  },
  name: {
    fontFamily: fonts.display.bold,
    fontSize: 14,
    letterSpacing: -0.224,
    lineHeight: NAME_LINE_HEIGHT,
    color: colors.ink,
    height: NAME_LINES * NAME_LINE_HEIGHT,
    textAlign: 'center',
    marginTop: 2,
  },
  part: { textAlign: 'center', marginTop: 6, minHeight: 16 },
  priceRow: { minHeight: 24, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  moq: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.12,
    color: colors.muted,
    textAlign: 'center',
    minHeight: 16,
    marginTop: 4,
  },
});
