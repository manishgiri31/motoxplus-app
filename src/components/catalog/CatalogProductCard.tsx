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
      <Text style={styles.name} numberOfLines={2}>
        {product.name}
      </Text>
      <View style={styles.metaRow}>
        <MonoLabel>{product.partNumber}</MonoLabel>
        {product.moq > 1 && <Text style={styles.moq}>MOQ {product.moq}</Text>}
      </View>
      <View style={styles.priceRow}>
        <BlurredPrice price={product.price} isDealerApproved={isDealerApproved} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: 12, gap: 6 },
  imageWrap: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.paper,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 4,
  },
  image: { width: '100%', height: '100%' },
  fitsBadge: { position: 'absolute', left: 6, top: 6 },
  stockBadge: { position: 'absolute', right: 6, top: 6 },
  name: { fontFamily: fonts.body.semiBold, fontSize: 14, lineHeight: 18, color: colors.ink },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  moq: { fontFamily: fonts.body.regular, fontSize: 11, color: colors.muted },
  priceRow: { marginTop: 4 },
});
