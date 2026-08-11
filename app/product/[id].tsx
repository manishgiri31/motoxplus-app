import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/useAuth';
import { canAccessDealerApp } from '@/auth/access';
import { useAddToCart } from '@/api/hooks/useCart';
import { useProduct, useProducts } from '@/api/hooks/useProducts';
import { ProductGallery } from '@/components/ProductGallery';
import { Badge, PriceTag, ProductCard, ProductDetailSkeleton } from '@/components/ui';
import { usePulseAnimation } from '@/hooks/use-pulse-animation';
import { BlurredPrice, Button, ErrorState, Eyebrow, MonoLabel, Stepper, Toast } from '@/src/components/ui';
import { colors, fonts } from '@/src/theme';
import { useRecentlyViewedStore } from '@/stores/recentlyViewedStore';
import { useWishlistStore } from '@/stores/wishlistStore';
import { HapticService } from '@/utils/haptics';

function SpecChip({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.specChip}>
      <Text style={styles.specChipLabel}>{label}</Text>
      <MonoLabel color="ink">{value}</MonoLabel>
    </View>
  );
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const productQuery = useProduct(id);
  const product = productQuery.data;
  const insets = useSafeAreaInsets();

  const { user, dealer } = useAuth();
  const isDealerApproved = canAccessDealerApp(user, dealer);

  const addToCart = useAddToCart();
  const recordView = useRecentlyViewedStore((s) => s.recordView);
  const wishlisted = useWishlistStore((s) => (product ? s.isWishlisted(product.id) : false));
  const toggleWishlist = useWishlistStore((s) => s.toggle);

  const [quantity, setQuantity] = useState(1);
  const [addedMessage, setAddedMessage] = useState<string | null>(null);
  const [showBuyNow, setShowBuyNow] = useState(false);
  const [vehiclesExpanded, setVehiclesExpanded] = useState(false);
  const heartPulse = usePulseAnimation();

  useEffect(() => {
    if (product) {
      recordView(product.id);
      setQuantity(product.moq);
      navigation.setOptions({ title: product.name });
    }
  }, [product, navigation, recordView]);

  // "Related products" has no backend endpoint — this is an honest, derivable
  // stand-in: other products in the same category (see docs/api.md §4).
  const relatedQuery = useProducts({ category: product?.category.slug, pageSize: 8 });
  const related = (relatedQuery.data?.products ?? []).filter((p) => p.id !== product?.id).slice(0, 6);

  if (productQuery.isLoading || !product) {
    if (productQuery.isError) {
      return (
        <SafeAreaView style={styles.screen} edges={['bottom']}>
          <ErrorState error={productQuery.error} onRetry={() => productQuery.refetch()} />
        </SafeAreaView>
      );
    }
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
          <ProductDetailSkeleton />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const outOfStock = product.stock <= 0;
  const primaryImage = product.productImages?.find((i) => i.isPrimary) ?? product.productImages?.[0];
  const visibleVehicles = vehiclesExpanded ? product.compatibility : product.compatibility.slice(0, 4);

  const handleAddToCart = () => {
    HapticService.light();
    addToCart.mutate(
      { payload: { productId: product.id, quantity }, product },
      {
        onSuccess: () => {
          setAddedMessage(`Added ${product.name} × ${quantity} to cart`);
          setShowBuyNow(true);
        },
        onError: () => Alert.alert('Could not add to cart', 'Please try again.'),
      }
    );
  };

  const handleBuyNow = () => {
    HapticService.light();
    setShowBuyNow(false);
    router.push('/checkout');
  };

  const handleShare = () => {
    Share.share({
      message: `${product.name} — ${product.brand} (Part #${product.partNumber}) on MotoXPlus`,
    });
  };

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <ProductGallery images={product.productImages ?? []} />

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <View style={styles.titleCol}>
              <Eyebrow>{product.category.name}</Eyebrow>
              <Text style={styles.name}>{product.name}</Text>
              <MonoLabel>{`Part #${product.partNumber}`}</MonoLabel>
            </View>
            <View style={styles.actions}>
              <Pressable onPress={handleShare} hitSlop={12} accessibilityRole="button" accessibilityLabel="Share product">
                <Feather name="share-2" size={22} color={colors.ink} />
              </Pressable>
              <Pressable
                onPress={() => {
                  HapticService.light();
                  heartPulse.pulse();
                  toggleWishlist({
                    productId: product.id,
                    name: product.name,
                    price: product.price,
                    mrp: product.mrp,
                    imageUrl: primaryImage?.imageUrl ?? null,
                    brand: product.brand,
                  });
                }}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                <Animated.View style={heartPulse.style}>
                  <Feather name="heart" size={22} color={wishlisted ? colors.red : colors.ink} />
                </Animated.View>
              </Pressable>
            </View>
          </View>

          {isDealerApproved && (
            <View>
              <PriceTag price={product.price} mrp={product.mrp} size="lg" />
              <Text style={styles.gstNote}>Dealer price · GST {product.gstRate}% extra</Text>
            </View>
          )}

          <View style={styles.badgeRow}>
            <Badge label={outOfStock ? 'Out of stock' : `${product.stock} in stock`} tone={outOfStock ? 'danger' : 'success'} />
            {product.warranty && product.warranty !== 'No Warranty' && <Badge label={product.warranty} tone="neutral" />}
          </View>

          <View style={styles.specRow}>
            <SpecChip label="Part No." value={product.partNumber} />
            <SpecChip label="HSN" value={product.hsnCode} />
            <SpecChip label="MOQ" value={String(product.moq)} />
            <SpecChip label="GST" value={`${product.gstRate}%`} />
          </View>

          {product.compatibility.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Compatible vehicles</Text>
              {visibleVehicles.map((v, i) => (
                <View key={v} style={[styles.vehicleRow, i !== visibleVehicles.length - 1 && styles.vehicleRowDivider]}>
                  <Feather name="check" size={16} color={colors.red} />
                  <Text style={styles.vehicleLabel}>{v}</Text>
                </View>
              ))}
              {product.compatibility.length > 4 && (
                <Pressable onPress={() => setVehiclesExpanded((v) => !v)} style={styles.expandRow} accessibilityRole="button">
                  <Text style={styles.expandLabel}>
                    {vehiclesExpanded ? 'Show less' : `Show all ${product.compatibility.length}`}
                  </Text>
                  <Feather name={vehiclesExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.muted} />
                </Pressable>
              )}
            </View>
          )}

          {product.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{product.description}</Text>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reviews</Text>
            <Text style={styles.description}>No reviews yet.</Text>
          </View>
        </View>

        {related.length > 0 && (
          <View style={styles.relatedSection}>
            <Text style={styles.sectionTitle}>{`More from ${product.category.name}`}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.relatedRow}>
              {related.map((p) => (
                <View key={p.id} style={styles.relatedItem}>
                  <ProductCard product={p} onPress={(item) => router.push(`/product/${item.id}`)} />
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.bottomPrice}>
          <BlurredPrice price={product.price} isDealerApproved={isDealerApproved} />
        </View>
        <Stepper value={quantity} moq={product.moq} max={product.stock > 0 ? product.stock : undefined} onChange={setQuantity} disabled={outOfStock} />
        <Button
          label={outOfStock ? 'Out of stock' : 'Add to cart'}
          variant="brand"
          onPress={handleAddToCart}
          loading={addToCart.isPending}
          disabled={outOfStock}
          style={styles.addButton}
        />
      </View>

      {showBuyNow && (
        <View style={styles.buyNowWrap}>
          <Button label="Buy Now" variant="solid" onPress={handleBuyNow} />
        </View>
      )}

      {addedMessage && <Toast message={addedMessage} onHide={() => setAddedMessage(null)} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 16, gap: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  titleCol: { flex: 1, gap: 6 },
  name: { fontFamily: fonts.display.bold, fontSize: 24, lineHeight: 30, color: colors.ink },
  actions: { flexDirection: 'row', gap: 16 },
  gstNote: { fontFamily: fonts.body.regular, fontSize: 12, color: colors.muted, marginTop: 4 },
  badgeRow: { flexDirection: 'row', gap: 8 },
  specRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  specChip: {
    flexBasis: '47%',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  specChipLabel: { fontFamily: fonts.body.medium, fontSize: 11, color: colors.muted, textTransform: 'uppercase' },
  section: { gap: 8 },
  sectionTitle: { fontFamily: fonts.display.bold, fontSize: 16, color: colors.ink },
  vehicleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  vehicleRowDivider: { borderBottomWidth: 1, borderBottomColor: colors.line },
  vehicleLabel: { fontFamily: fonts.body.regular, fontSize: 14, color: colors.ink },
  expandRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 12 },
  expandLabel: { fontFamily: fonts.body.semiBold, fontSize: 13, color: colors.muted },
  description: { fontFamily: fonts.body.regular, fontSize: 14, lineHeight: 20, color: colors.muted },
  relatedSection: { gap: 12, marginTop: 8 },
  relatedRow: { paddingHorizontal: 16, gap: 12 },
  relatedItem: { width: 160 },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.card,
  },
  bottomPrice: { flexShrink: 1 },
  addButton: { flex: 1 },
  buyNowWrap: { position: 'absolute', bottom: 96, right: 16 },
});
