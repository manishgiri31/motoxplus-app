import { useEffect } from 'react';
import { View, type DimensionValue } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  className?: string;
}

export function Skeleton({ width = '100%', height = 16, radius = 6, className }: SkeletonProps) {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(withSequence(withTiming(1, { duration: 700 }), withTiming(0.4, { duration: 700 })), -1);
  }, [opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius }, style]}
      className={`bg-border ${className ?? ''}`}
    />
  );
}

export function ProductCardSkeleton() {
  return (
    <View className="w-full gap-sm">
      <Skeleton height={140} radius={10} />
      <Skeleton height={14} width="80%" />
      <Skeleton height={14} width="50%" />
      <Skeleton height={18} width="40%" />
    </View>
  );
}

export function ListRowSkeleton() {
  return (
    <View className="flex-row items-center gap-md p-md">
      <Skeleton width={56} height={56} radius={8} />
      <View className="flex-1 gap-sm">
        <Skeleton height={14} width="70%" />
        <Skeleton height={14} width="40%" />
      </View>
    </View>
  );
}

// Matches CategoryPill (app/(tabs)/index.tsx): a 64x64 circle over a
// two-line label, in the same w-24 rail slot.
export function CategoryPillSkeleton() {
  return (
    <View className="w-24 items-center gap-xs mr-md">
      <Skeleton width={64} height={64} radius={32} />
      <Skeleton height={12} width="70%" />
    </View>
  );
}

// Matches the category grid card (app/(tabs)/categories.tsx): icon circle +
// title + subtitle inside the same bordered card shell.
export function CategoryCardSkeleton() {
  return (
    <View className="flex-1 m-xs bg-card border border-border rounded-lg p-lg gap-sm">
      <Skeleton width={48} height={48} radius={24} />
      <Skeleton height={15} width="80%" />
      <Skeleton height={12} width="50%" />
    </View>
  );
}

// Matches OrderRow (app/(tabs)/orders.tsx): order number + date + status
// badge on one line, item count + total on the next.
export function OrderRowSkeleton() {
  return (
    <View className="p-lg border-b border-border gap-sm">
      <View className="flex-row justify-between items-start">
        <View className="gap-xs">
          <Skeleton height={14} width={90} />
          <Skeleton height={12} width={110} />
        </View>
        <Skeleton height={20} width={70} radius={10} />
      </View>
      <View className="flex-row justify-between">
        <Skeleton height={13} width={70} />
        <Skeleton height={14} width={80} />
      </View>
    </View>
  );
}

// Matches the product detail screen (app/product/[id].tsx): full-width
// gallery image, then brand/title/price lines and a short spec block.
export function ProductDetailSkeleton() {
  return (
    <View>
      <Skeleton height={320} radius={0} />
      <View className="p-lg gap-md">
        <Skeleton height={12} width="30%" />
        <Skeleton height={24} width="85%" />
        <Skeleton height={12} width="40%" />
        <Skeleton height={26} width="35%" />
        <View className="gap-sm mt-md">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={14} />
          ))}
        </View>
      </View>
    </View>
  );
}
