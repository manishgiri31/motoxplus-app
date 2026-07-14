import { Image } from 'expo-image';
import { useState } from 'react';
import { Dimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import type { ProductImage } from '@/api/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_SIZE = SCREEN_WIDTH;

function ZoomableImage({ uri }: { uri: string }) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.min(Math.max(savedScale.value * e.scale, 1), 4);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value <= 1) {
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      }
    });

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      if (scale.value <= 1) return;
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      const next = scale.value > 1 ? 1 : 2.5;
      scale.value = withTiming(next);
      savedScale.value = next;
      if (next === 1) {
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      }
    });

  const composed = Gesture.Simultaneous(pinch, pan, doubleTap);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <View style={{ width: IMAGE_SIZE, height: IMAGE_SIZE, overflow: 'hidden' }}>
      <GestureDetector gesture={composed}>
        <Animated.View style={[{ width: '100%', height: '100%' }, animatedStyle]}>
          <Image
            source={{ uri }}
            style={{ width: '100%', height: '100%' }}
            contentFit="contain"
            cachePolicy="memory-disk"
            priority="high"
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

export function ProductGallery({ images }: { images: ProductImage[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const sorted = [...images].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder);

  if (sorted.length === 0) {
    return <View style={{ width: IMAGE_SIZE, height: IMAGE_SIZE }} className="bg-surface" />;
  }

  return (
    <View className="gap-sm">
      <Animated.ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / IMAGE_SIZE);
          setActiveIndex(index);
        }}
      >
        {sorted.map((image) => (
          <ZoomableImage key={image.id} uri={image.imageUrl} />
        ))}
      </Animated.ScrollView>
      {sorted.length > 1 && (
        <View className="flex-row justify-center gap-xs">
          {sorted.map((image, i) => (
            <View
              key={image.id}
              className={`h-1.5 rounded-full ${i === activeIndex ? 'w-4 bg-secondary' : 'w-1.5 bg-border'}`}
            />
          ))}
        </View>
      )}
    </View>
  );
}
