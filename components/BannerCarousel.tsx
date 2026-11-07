import { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { alpha, colors, font, radii, screenPaddingX, textStyles } from '@/src/theme';

const AUTO_ADVANCE_MS = 5000;

export interface BannerSlide {
  id: string;
  eyebrow: string;
  title: string;
  /** brand: the accent red; dark: the ink card (default). */
  tone?: 'brand' | 'dark';
  /** Link text shown under the title ("Shop now"); the whole card is tappable. */
  cta?: string;
  onPress?: () => void;
}

// Promo carousel: one 18pt-radius dark card per page, page dots below. It
// advances every 5s, pauses while a finger is on it (the 5s window restarts on
// release), and does not auto-advance at all when Reduce Motion is on.
export function BannerCarousel({ slides }: { slides: BannerSlide[] }) {
  const reduceMotion = useReduceMotion();
  const count = slides.length;
  const scrollRef = useRef<ScrollView>(null);
  const [pageWidth, setPageWidth] = useState(0);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const touching = useRef(false);
  // Bumped whenever the user lets go, which rebuilds the timer.
  const [restart, setRestart] = useState(0);

  useEffect(() => {
    if (reduceMotion || count < 2 || pageWidth === 0) return;
    const timer = setInterval(() => {
      if (touching.current) return;
      const next = (activeRef.current + 1) % count;
      activeRef.current = next;
      setActive(next);
      scrollRef.current?.scrollTo({ x: next * pageWidth, animated: true });
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [reduceMotion, count, pageWidth, restart]);

  if (count === 0) return null;

  const onLayout = (e: LayoutChangeEvent) => setPageWidth(e.nativeEvent.layout.width);

  const onSettle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (pageWidth === 0) return;
    const index = Math.min(count - 1, Math.max(0, Math.round(e.nativeEvent.contentOffset.x / pageWidth)));
    activeRef.current = index;
    setActive(index);
  };

  const release = () => {
    touching.current = false;
    setRestart((n) => n + 1);
  };

  return (
    <View onLayout={onLayout} style={styles.wrap}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onTouchStart={() => {
          touching.current = true;
        }}
        onTouchEnd={release}
        onTouchCancel={release}
        onMomentumScrollEnd={onSettle}
        scrollEventThrottle={16}
      >
        {slides.map((slide) => (
          <View key={slide.id} style={{ width: pageWidth || '100%', paddingHorizontal: screenPaddingX }}>
            <Pressable
              onPress={slide.onPress}
              disabled={!slide.onPress}
              style={({ pressed }) => [styles.card, slide.tone === 'brand' && styles.cardBrand, pressed && styles.pressed]}
              accessibilityRole={slide.onPress ? 'button' : undefined}
              accessibilityLabel={`${slide.eyebrow}. ${slide.title.replace(/\n/g, ' ')}${slide.cta ? `. ${slide.cta}` : ''}`}
            >
              <Text style={[styles.eyebrow, slide.tone === 'brand' && styles.eyebrowBrand]} maxFontSizeMultiplier={1.2}>
                {slide.eyebrow}
              </Text>
              <Text style={styles.title} maxFontSizeMultiplier={1.2}>
                {slide.title}
              </Text>
              {!!slide.cta && (
                <View style={styles.cta}>
                  <Text style={[styles.ctaLabel, slide.tone === 'brand' && styles.ctaLabelBrand]} maxFontSizeMultiplier={1.2}>
                    {`${slide.cta} ›`}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>
        ))}
      </ScrollView>

      {count > 1 && (
        <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {slides.map((slide, i) => (
            <View key={slide.id} style={[styles.dot, i === active && styles.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  card: {
    minHeight: 150,
    justifyContent: 'flex-end',
    gap: 6,
    padding: 20,
    borderRadius: radii.sm,
    backgroundColor: colors.inkSurface,
  },
  cardBrand: { backgroundColor: colors.accent },
  pressed: { opacity: 0.85 },
  eyebrow: { ...textStyles.caption, ...font(600), color: colors.onDarkMuted, textTransform: 'uppercase', letterSpacing: 0.6 },
  eyebrowBrand: { color: alpha(colors.white, 0.8) },
  title: { ...textStyles.cardTitle, fontSize: 22, lineHeight: 27, color: colors.white },
  // White pill, like a marketplace "Shop now" chip.
  cta: { alignSelf: 'flex-start', marginTop: 6, paddingHorizontal: 14, paddingVertical: 6, borderRadius: radii.pill, backgroundColor: colors.white },
  ctaLabel: { ...font(600), fontSize: 14, lineHeight: 18, color: colors.ink },
  ctaLabelBrand: { color: colors.accent },
  dots: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: alpha(colors.ink, 0.2) },
  dotActive: { backgroundColor: colors.ink },
});
