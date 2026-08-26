import { useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { colors, fonts, radii } from '@/src/theme';

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
      <View style={styles.card}>
        <Text style={styles.eyebrow}>{slide.eyebrow}</Text>
        <Text style={styles.title}>{slide.title}</Text>
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

  // currentIndex only ever grows on auto-advance, and can also be walked to
  // either edge by enough manual swipes — either way, calling scrollToIndex
  // with an index outside virtualData eventually throws an uncaught
  // invariant violation (reachable in any session left open ~25min+, see
  // BUGS-APP.md finding #2). Once the live position gets within this many
  // slides of either end of the synthetic array, silently re-center (no
  // animation) to the equivalent position in the middle band before it can
  // go out of bounds.
  const RECENTER_MARGIN = count * 10;

  const recenterIfNeeded = (index: number) => {
    if (index > RECENTER_MARGIN && index < virtualData.length - RECENTER_MARGIN) {
      return index;
    }
    const recentered = startIndex + (((index % count) + count) % count);
    currentIndex.current = recentered;
    listRef.current?.scrollToIndex({ index: recentered, animated: false });
    return recentered;
  };

  const stopAutoScroll = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const startAutoScroll = () => {
    stopAutoScroll();
    if (count <= 1) return;
    timerRef.current = setInterval(() => {
      const safeIndex = recenterIfNeeded(currentIndex.current);
      const next = safeIndex + 1;
      currentIndex.current = next;
      listRef.current?.scrollToIndex({ index: next, animated: true });
    }, AUTO_SCROLL_INTERVAL_MS);
  };

  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    currentIndex.current = index;
    setActiveDot(((index % count) + count) % count);
    recenterIfNeeded(index);
    // Re-arm on every settle, whether the scroll was a manual swipe or one
    // of our own auto-advances, so the interval always restarts a fresh 5s
    // window from "the last time the carousel actually moved."
    startAutoScroll();
  };

  if (count === 0) return null;

  if (count === 1) {
    return (
      <View style={styles.singleWrap}>
        <BannerCard slide={slides[0]} />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
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
      <View style={styles.dots}>
        {slides.map((slide, i) => (
          <View key={slide.id} style={[styles.dot, i === activeDot && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    borderRadius: radii.lg,
    backgroundColor: colors.dark,
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  eyebrow: {
    fontFamily: fonts.mono.medium,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.red,
    marginBottom: 6,
  },
  title: { fontFamily: fonts.display.bold, fontSize: 22, lineHeight: 28, color: '#FFFFFF' },
  singleWrap: { marginBottom: 24 },
  wrap: { marginBottom: 24, gap: 8 },
  dots: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.line },
  dotActive: { width: 16, backgroundColor: colors.red },
});
