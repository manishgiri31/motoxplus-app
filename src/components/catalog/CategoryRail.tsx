import { router } from 'expo-router';
import { memo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Category } from '@/api/types';
import { useFocusRing } from '@/hooks/use-focus-ring';
import { colors, layout, screenPaddingX, textStyles } from '@/src/theme';
import { HapticService } from '@/utils/haptics';

import { Skeleton } from '../ui/Skeleton';
import { CategoryVisual } from './CategoryGlyph';

const DISC = 64;
const ITEM_WIDTH = 76;

// "Shop by" row: a horizontally scrolling strip of 64pt icon discs with a 12pt
// label underneath. Discs are bgAlt, so the rail sits on the white page.
export const CategoryRail = memo(function CategoryRail({ categories }: { categories: Category[] }) {
  if (categories.length === 0) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      accessibilityRole="list"
    >
      {categories.map((category) => (
        <CategoryItem key={category.id} category={category} />
      ))}
    </ScrollView>
  );
});

/** Same footprint as the real rail: discs and a label line. */
export function CategoryRailSkeleton() {
  return (
    <View style={[styles.content, styles.skeletonRow]}>
      {Array.from({ length: 5 }).map((_, i) => (
        <View key={i} style={styles.item}>
          <Skeleton width={DISC} height={DISC} radius={DISC / 2} />
          <Skeleton width={48} height={12} radius={6} />
        </View>
      ))}
    </View>
  );
}

function CategoryItem({ category }: { category: Category }) {
  const focusRing = useFocusRing();
  return (
    <Pressable
      onPress={() => {
        HapticService.light();
        router.push(`/category/${category.slug}`);
      }}
      onFocus={focusRing.onFocus}
      onBlur={focusRing.onBlur}
      accessibilityRole="button"
      accessibilityLabel={`${category.name}, ${category._count.products} products`}
      style={styles.item}
    >
      {({ pressed }) => (
        <>
          <View style={[styles.disc, pressed && styles.pressed, focusRing.ringStyle]}>
            <CategoryVisual category={category} photoSize={DISC - 10} iconSize={26} color={colors.ink} />
          </View>
          <Text style={styles.label} numberOfLines={2} maxFontSizeMultiplier={1.2}>
            {category.name}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: screenPaddingX, gap: 8 },
  skeletonRow: { flexDirection: 'row', overflow: 'hidden' },
  item: { width: ITEM_WIDTH, alignItems: 'center', gap: 8, minHeight: layout.minTouchTarget },
  disc: { width: DISC, height: DISC, borderRadius: DISC / 2, backgroundColor: colors.bgAlt, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  pressed: { opacity: 0.6 },
  label: { ...textStyles.caption, color: colors.ink, textAlign: 'center' },
});
