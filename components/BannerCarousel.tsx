import { useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const AUTO_SCROLL_INTERVAL_MS = 5000;
// Large enough that no realistic session of manual swiping (forward or
// backward) or 5s auto-advances runs off either end — the "infinite loop"
// is really a very long straight line, not a true ring, which avoids the
// jarring position-reset jump that wrapping-index approaches need.
const LOOP_MULTIPLIER = 200;

export interface BannerSlide {
  id: string;
  eyebrow: string;
  title: string;
}

function BannerCard({ slide }: { slide: BannerSlide }) {
  return (
    <View style={{ width: SCREEN_WIDTH }}>
      <View className="mx-lg rounded-lg bg-secondary px-xl py-2xl">
        <Text className="text-[13px] font-semibold uppercase tracking-wide text-primary mb-xs">
          {slide.eyebrow}
        </Text>
        <Text className="text-h2 font-bold text-secondary-foreground mb-xs">{slide.title}</Text>
      </View>
    </View>
  );
}

export function BannerCarousel({ slides }: { slides: BannerSlide[] }) {
  const count = slides.length;
  const startIndex = Math.floor(LOOP_MULTIPLIER / 2) * count;
  const listRef = useRef<FlatList>(null);
  const currentIndex = useRef(startIndex);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [activeDot, setActiveDot] = useState(0);
  const virtualData = useMemo(() => Array.from({ length: count * LOOP_MULTIPLIER }), [count]);

  const stopAutoScroll = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const startAutoScroll = () => {
    stopAutoScroll();
    if (count <= 1) return;
    timerRef.current = setInterval(() => {
      const next = currentIndex.current + 1;
      currentIndex.current = next;
      listRef.current?.scrollToIndex({ index: next, animated: true });
    }, AUTO_SCROLL_INTERVAL_MS);
  };

  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    currentIndex.current = index;
    setActiveDot(((index % count) + count) % count);
    // Re-arm on every settle, whether the scroll was a manual swipe or one
    // of our own auto-advances, so the interval always restarts a fresh 5s
    // window from "the last time the carousel actually moved."
    startAutoScroll();
  };

  if (count === 0) return null;

  if (count === 1) {
    return (
      <View className="mb-2xl">
        <BannerCard slide={slides[0]} />
      </View>
    );
  }

  return (
    <View className="mb-2xl gap-sm">
      <FlatList
        ref={listRef}
        data={virtualData}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={startIndex}
        getItemLayout={(_, i) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * i, index: i })}
        renderItem={({ index }) => <BannerCard slide={slides[index % count]} />}
        onScrollBeginDrag={stopAutoScroll}
        onMomentumScrollEnd={onMomentumScrollEnd}
        onLayout={startAutoScroll}
      />
      <View className="flex-row items-center justify-center gap-xs">
        {slides.map((slide, i) => (
          <View
            key={slide.id}
            className={`h-1.5 rounded-full ${i === activeDot ? 'w-4 bg-secondary' : 'w-1.5 bg-border'}`}
          />
        ))}
      </View>
    </View>
  );
}
