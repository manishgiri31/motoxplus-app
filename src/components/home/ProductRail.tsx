import { memo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import type { Product } from '@/api/types';
import { CatalogProductCard } from '@/src/components/catalog/CatalogProductCard';
import { ProductTileSkeleton } from '@/src/components/catalog/CatalogSkeletons';
import { screenPaddingX } from '@/src/theme';

import { SectionError } from './SectionError';
import { SectionHeader } from './SectionHeader';

export const RAIL_CARD_WIDTH = 160;
const GAP = 12;

export interface ProductRailProps {
  title: string;
  products: Product[];
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  onSeeAll?: () => void;
  /** Show "Few left" as a warning badge on each card (Low Stock). */
  stockBadge?: boolean;
}

// Horizontal rail of 160pt-wide product cards. Loading shows card-shaped
// skeletons, a failed query shows an inline retry, and an empty list hides the
// whole section.
export const ProductRail = memo(function ProductRail({
  title,
  products,
  loading = false,
  error = false,
  onRetry,
  onSeeAll,
  stockBadge = false,
}: ProductRailProps) {
  if (!loading && !error && products.length === 0) return null;

  return (
    <View style={styles.section}>
      <SectionHeader title={title} onSeeAll={!loading && !error ? onSeeAll : undefined} />
      {error ? (
        <SectionError what={title.toLowerCase()} onRetry={onRetry ?? (() => {})} />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEnabled={!loading}
          contentContainerStyle={styles.content}
          snapToInterval={RAIL_CARD_WIDTH + GAP}
          snapToAlignment="start"
          decelerationRate="fast"
        >
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <View key={i} style={styles.cell}>
                  <ProductTileSkeleton />
                </View>
              ))
            : products.map((product) => (
                <View key={product.id} style={styles.cell}>
                  <CatalogProductCard product={product} stockBadge={stockBadge} />
                </View>
              ))}
        </ScrollView>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  section: { gap: 4 },
  content: { paddingHorizontal: screenPaddingX, gap: GAP },
  cell: { width: RAIL_CARD_WIDTH },
});
