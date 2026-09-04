import { useEffect } from 'react';
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { colors, radii } from '@/src/theme';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

// Opacity-only pulse — not a scale/translate animation, so it isn't gated by
// reduce-motion (see the Button/Card/Toast micro-interactions, which are).
export function Skeleton({ width = '100%', height = 16, radius = radii.sm, style }: SkeletonProps) {
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(withSequence(withTiming(1, { duration: 700 }), withTiming(0.5, { duration: 700 })), -1, true);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.View style={[{ width, height, borderRadius: radius, backgroundColor: colors.line }, animatedStyle, style]} />;
}

// Mirrors CatalogProductCard's metrics (12px padding, square image, 2-line
// name block, meta + price rows) so the grid doesn't jump when real cards
// swap in for the loading state.
export function SkeletonProductCard() {
  return (
    <View style={styles.productCard}>
      <View style={styles.productCardImage}>
        <Skeleton width="100%" height="100%" radius={radii.sm} />
      </View>
      <Skeleton height={36} />
      <View style={styles.productCardFooter}>
        <Skeleton height={12} width="55%" />
        <Skeleton height={20} width="45%" />
      </View>
    </View>
  );
}

export function SkeletonListRow() {
  return (
    <View style={styles.listRow}>
      <Skeleton width={56} height={56} radius={radii.md} />
      <View style={styles.listRowText}>
        <Skeleton height={14} width="70%" />
        <Skeleton height={14} width="40%" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  productCard: {
    width: '100%',
    padding: 12,
    gap: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
  },
  productCardImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radii.sm,
    overflow: 'hidden',
  },
  productCardFooter: {
    gap: 6,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
  },
  listRowText: {
    flex: 1,
    gap: 8,
  },
});
