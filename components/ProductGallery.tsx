import Feather from '@expo/vector-icons/Feather';
import { useMemo, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import type { ProductImage } from '@/api/types';
import { Image } from '@/components/ui/Image';
import { colors, motion } from '@/src/theme';

const MAX_ZOOM = 4;
const DOUBLE_TAP_ZOOM = 2.5;
const TIMING = { duration: motion.duration.fast, easing: motion.easing };

interface ZoomableImageProps {
  uri: string;
  size: number;
  zoomed: boolean;
  onZoomChange: (zoomed: boolean) => void;
}

function ZoomableImage({ uri, size, zoomed, onZoomChange }: ZoomableImageProps) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const reset = () => {
    'worklet';
    scale.value = withTiming(1, TIMING);
    savedScale.value = 1;
    translateX.value = withTiming(0, TIMING);
    translateY.value = withTiming(0, TIMING);
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  };

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.min(Math.max(savedScale.value * e.scale, 1), MAX_ZOOM);
    })
    .onEnd(() => {
      if (scale.value <= 1.01) {
        reset();
        runOnJS(onZoomChange)(false);
      } else {
        savedScale.value = scale.value;
        runOnJS(onZoomChange)(true);
      }
    });

  // Only active while zoomed in, so a one-finger swipe at 1x still pages the
  // gallery and scrolls the screen.
  const pan = Gesture.Pan()
    .enabled(zoomed)
    .onUpdate((e) => {
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
      if (scale.value > 1) {
        reset();
        runOnJS(onZoomChange)(false);
      } else {
        scale.value = withTiming(DOUBLE_TAP_ZOOM, TIMING);
        savedScale.value = DOUBLE_TAP_ZOOM;
        runOnJS(onZoomChange)(true);
      }
    });

  const composed = Gesture.Simultaneous(pinch, pan, doubleTap);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <View style={{ width: size, height: size, overflow: 'hidden', backgroundColor: colors.white }}>
      <GestureDetector gesture={composed}>
        <Animated.View style={[styles.fill, animatedStyle]}>
          <Image source={{ uri }} style={styles.fill} contentFit="contain" cachePolicy="memory-disk" priority="high" />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

export interface ProductGalleryProps {
  images: ProductImage[];
  /** Space reserved above the image for a floating nav bar. */
  topInset?: number;
}

// Full-width, white-background gallery: swipe between images, pinch or
// double-tap to zoom, page dots underneath.
export function ProductGallery({ images, topInset = 0 }: ProductGalleryProps) {
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const sorted = useMemo(
    () => [...images].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder),
    [images]
  );

  if (sorted.length === 0) {
    return (
      <View style={[styles.empty, { width, height: width + topInset, paddingTop: topInset }]}>
        <Feather name="image" size={48} color={colors.ink3} accessibilityElementsHidden importantForAccessibility="no" />
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { paddingTop: topInset }]}>
      <Animated.ScrollView
        horizontal
        pagingEnabled
        scrollEnabled={!zoomed}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
      >
        {sorted.map((image) => (
          <ZoomableImage key={image.id} uri={image.imageUrl} size={width} zoomed={zoomed} onZoomChange={setZoomed} />
        ))}
      </Animated.ScrollView>
      {sorted.length > 1 && (
        <View
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={`Image ${activeIndex + 1} of ${sorted.length}`}
          style={styles.dots}
        >
          {sorted.map((image, i) => (
            <View key={image.id} style={[styles.dot, i === activeIndex && styles.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { width: '100%', height: '100%' },
  wrap: { backgroundColor: colors.white, paddingBottom: 12, gap: 12 },
  empty: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, minHeight: 8 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.line },
  dotActive: { backgroundColor: colors.ink },
});
