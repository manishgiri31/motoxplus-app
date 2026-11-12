import { useEffect, useState } from 'react';
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { colors, radii } from '@/src/theme';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

// Opacity of each vertical strip in the sweeping highlight; together they
// read as a soft-edged band without needing a gradient dependency.
const SHIMMER_STRIPS = [0.1, 0.22, 0.38, 0.22, 0.1];
const SHIMMER_MS = 1300;

// A lineSoft block with a light band sweeping left to right. With Reduce Motion
// on it stays a plain static block.
export function Skeleton({ width = '100%', height = 16, radius = radii.sm, style }: SkeletonProps) {
  const reduceMotion = useReduceMotion();
  const [measured, setMeasured] = useState(0);
  const progress = useSharedValue(0);
  const bandWidth = Math.max(measured * 0.6, 48);

  useEffect(() => {
    if (reduceMotion || measured === 0) return;
    progress.value = 0;
    progress.value = withRepeat(withTiming(1, { duration: SHIMMER_MS, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(progress);
  }, [measured, reduceMotion, progress]);

  const bandStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(progress.value, [0, 1], [-bandWidth, measured]) }],
  }));

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={(e) => setMeasured(e.nativeEvent.layout.width)}
      style={[{ width, height, borderRadius: radius, backgroundColor: colors.lineSoft, overflow: 'hidden' }, style]}
    >
      {!reduceMotion && measured > 0 && (
        <Animated.View pointerEvents="none" style={[styles.band, { width: bandWidth }, bandStyle]}>
          {SHIMMER_STRIPS.map((opacity, i) => (
            <View key={i} style={{ flex: 1, backgroundColor: `rgba(255,255,255,${opacity})` }} />
          ))}
        </Animated.View>
      )}
    </View>
  );
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

const styles = StyleSheet.create({
  band: { ...StyleSheet.absoluteFillObject, right: undefined, flexDirection: 'row' },
  productCard: {
    width: '100%',
    padding: 12,
    gap: 10,
    backgroundColor: colors.card,
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
});
