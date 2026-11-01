import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { radii, screenPaddingX, sectionGap } from '@/src/theme';

import { Skeleton } from '../ui/Skeleton';

// Same shape as app/product/[id].tsx: gallery square (with the floating nav
// bar's inset above it), dots, centered eyebrow / name / part number, price,
// chip row, segmented control, then a few lines of body copy.
export function ProductDetailSkeleton({ topInset = 0 }: { topInset?: number }) {
  const { width } = useWindowDimensions();
  return (
    <View accessibilityLabel="Loading product" accessibilityRole="progressbar">
      <View style={{ paddingTop: topInset, paddingBottom: 12, gap: 12 }}>
        <Skeleton width={width} height={width} radius={0} />
        <View style={styles.dots}>
          <Skeleton width={7} height={7} radius={4} />
          <Skeleton width={7} height={7} radius={4} />
          <Skeleton width={7} height={7} radius={4} />
        </View>
      </View>

      <View style={[styles.center, { paddingHorizontal: screenPaddingX }]}>
        <Skeleton width={80} height={12} />
        <Skeleton width="75%" height={28} />
        <Skeleton width={120} height={14} />
      </View>

      <View style={[styles.center, styles.price]}>
        <Skeleton width={140} height={28} />
        <Skeleton width={160} height={12} />
      </View>

      <View style={styles.chips}>
        <Skeleton width={76} height={28} radius={radii.pill} />
        <Skeleton width={120} height={28} radius={radii.pill} />
        <Skeleton width={90} height={28} radius={radii.pill} />
        <Skeleton width={80} height={28} radius={radii.pill} />
      </View>

      <View style={styles.body}>
        <Skeleton height={40} radius={radii.sm} />
        <View style={styles.lines}>
          <Skeleton height={17} />
          <Skeleton height={17} />
          <Skeleton height={17} width="60%" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  center: { alignItems: 'center', gap: 8 },
  price: { marginTop: 20 },
  chips: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 20, overflow: 'hidden' },
  body: { paddingHorizontal: screenPaddingX, marginTop: sectionGap, gap: 20 },
  lines: { gap: 10 },
});
