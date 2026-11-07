import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { colors, radii } from '@/src/theme';

import { Skeleton } from '../ui/Skeleton';
import { useCategoryCardSide } from './CategoryCard';

// Loading placeholders that mirror the real cards' shape and metrics, so the
// grid doesn't jump when content swaps in.

/** Mirrors <CategoryCard>: square bgAlt card, icon disc, two text lines. */
export function CategoryCardSkeleton() {
  const side = useCategoryCardSide();
  return (
    <View style={[styles.categoryCard, { minHeight: side }]}>
      <Skeleton width={56} height={56} radius={28} />
      <View style={styles.categoryText}>
        <Skeleton width="70%" height={17} radius={6} />
        <Skeleton width="45%" height={14} radius={6} />
      </View>
    </View>
  );
}

/** Mirrors <CatalogProductCard>: image block on top, then name, part, price rows. */
export function ProductTileSkeleton() {
  const { fontScale } = useWindowDimensions();
  const scale = Math.min(Math.max(fontScale, 1), 1.2);
  return (
    <View style={styles.tile}>
      <View style={styles.tileImage}>
        <Skeleton width="100%" height="100%" radius={radii.input} />
      </View>
      <View style={styles.tileBody}>
        <View style={{ height: 40 * scale, gap: 6, justifyContent: 'center' }}>
          <Skeleton width="90%" height={14} radius={6} />
          <Skeleton width="65%" height={14} radius={6} />
        </View>
        <Skeleton width="45%" height={12} radius={6} />
        <Skeleton width="40%" height={17} radius={6} style={{ marginTop: 6 }} />
        <Skeleton width="55%" height={12} radius={6} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  categoryCard: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: colors.bgAlt,
    borderRadius: radii.card,
  },
  categoryText: { gap: 6 },
  tile: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: colors.white,
    borderRadius: radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  tileImage: { width: '100%', aspectRatio: 1, padding: 12, backgroundColor: colors.white },
  tileBody: { paddingHorizontal: 10, paddingTop: 2, paddingBottom: 10, gap: 6 },
});
