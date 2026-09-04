import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/auth/useAuth';
import { canAccessDealerApp } from '@/auth/access';
import type { Product } from '@/api/types';
import { Image } from '@/components/ui';
import { LOW_STOCK_THRESHOLD } from '@/constants/stock';
import type { SelectedVehicle } from '@/stores/vehicleStore';
import { getImageSource } from '@/utils/image';
import { isCompatibleWithVehicle } from '@/utils/vehicleCompatibility';

import { Badge } from '../ui/Badge';
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
  const outOfStock = product.stock <= 0;
  const lowStock = !outOfStock && product.stock <= LOW_STOCK_THRESHOLD;

  return (
    <Card onPress={() => router.push(`/product/${product.id}`)} accessibilityLabel={product.name} style={styles.card}>
      <View style={styles.imageWrap}>
        {/* contain (not cover) — spare-part photos come in wildly different
            dimensions and cover would crop/stretch them. The neutral fill
            behind the letterboxed image keeps the gap from reading as broken.
            The missing-image placeholder renders into this same box, so the
            card doesn't jump when an image loads in. */}
        <Image source={getImageSource(primaryImage?.imageUrl)} style={styles.image} contentFit="contain" cachePolicy="memory-disk" />
        {fits && vehicle && (
          <View style={styles.fitsBadge}>
            <Badge label={`Fits your ${vehicle.modelName} ✓`} variant="success" />
          </View>
        )}
        {(outOfStock || lowStock) && (
          <View style={styles.stockBadge}>
            <Badge label={outOfStock ? 'Out of stock' : `Only ${product.stock} left`} variant="brand" />
          </View>
        )}
      </View>

      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={NAME_LINES}>
          {product.name}
        </Text>
        {/* marginTop:auto keeps the meta + price block on a common baseline at
            the bottom of every card even if a card is ever stretched taller. */}
        <View style={styles.footer}>
          <View style={styles.metaRow}>
            <MonoLabel style={styles.metaPart} numberOfLines={1}>
              {product.partNumber}
            </MonoLabel>
            {product.moq > 1 && (
              <Text style={styles.moq} numberOfLines={1}>
                MOQ {product.moq}
              </Text>
            )}
          </View>
          <View style={styles.priceRow}>
            <BlurredPrice price={product.price} isDealerApproved={isDealerApproved} />
          </View>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, padding: 12 },
  imageWrap: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.paper,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 10,
  },
  image: { width: '100%', height: '100%' },
  fitsBadge: { position: 'absolute', left: 6, top: 6 },
  stockBadge: { position: 'absolute', right: 6, top: 6 },
  body: { flex: 1 },
  name: {
    fontFamily: fonts.body.semiBold,
    fontSize: 14,
    lineHeight: NAME_LINE_HEIGHT,
    color: colors.ink,
    height: NAME_LINES * NAME_LINE_HEIGHT,
  },
  footer: { marginTop: 'auto', paddingTop: 6, gap: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 16 },
  metaPart: { flexShrink: 1 },
  moq: { fontFamily: fonts.body.regular, fontSize: 11, color: colors.muted, flexShrink: 0 },
  priceRow: { minHeight: 24, justifyContent: 'center' },
});
