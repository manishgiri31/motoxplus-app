import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/auth/useAuth';
import { canAccessDealerApp } from '@/auth/access';
import type { Product } from '@/api/types';
import { Image } from '@/components/ui';
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
}

export function CatalogProductCard({ product, vehicle = null }: CatalogProductCardProps) {
  const { user, dealer } = useAuth();
  const isDealerApproved = canAccessDealerApp(user, dealer);
  const primaryImage = product.productImages?.find((i) => i.isPrimary) ?? product.productImages?.[0];
  const fits = isCompatibleWithVehicle(product, vehicle);

  return (
    <Card onPress={() => router.push(`/product/${product.id}`)} accessibilityLabel={product.name} style={styles.card}>
      <View style={styles.imageWrap}>
        <Image source={getImageSource(primaryImage?.imageUrl)} style={styles.image} contentFit="contain" cachePolicy="memory-disk" />
        {fits && vehicle && (
          <View style={styles.fitsBadge}>
            <Badge label={`Fits your ${vehicle.modelName} ✓`} variant="success" />
          </View>
        )}
      </View>
      <Text style={styles.name} numberOfLines={2}>
        {product.name}
      </Text>
      <MonoLabel>{product.partNumber}</MonoLabel>
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
  name: { fontFamily: fonts.body.semiBold, fontSize: 14, lineHeight: 18, color: colors.ink },
  priceRow: { marginTop: 4 },
});
