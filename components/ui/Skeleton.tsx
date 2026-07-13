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
      className={`bg-graytone-200 ${className ?? ''}`}
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
