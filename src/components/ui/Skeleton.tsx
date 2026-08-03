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

export function SkeletonProductCard() {
  return (
    <View style={styles.productCard}>
      <Skeleton height={140} radius={radii.md} />
      <Skeleton height={14} width="80%" />
      <Skeleton height={14} width="50%" />
      <Skeleton height={18} width="40%" />
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
    gap: 8,
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
