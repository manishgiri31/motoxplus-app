import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { memo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Category } from '@/api/types';
import { useFocusRing } from '@/hooks/use-focus-ring';
import { colors, fonts, layout } from '@/src/theme';
import { categoryIcon } from '@/utils/categoryIcon';
import { HapticService } from '@/utils/haptics';

// "Shop by" row: a horizontally scrolling strip of icon discs with a label
// underneath, the way the store this design follows lists its product families.
// `tone` picks the disc color so it reads on either a white or a grey band.
export const CategoryRail = memo(function CategoryRail({
  categories,
  tone = 'light',
}: {
  categories: Category[];
  tone?: 'light' | 'alt';
}) {
  if (categories.length === 0) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      accessibilityRole="list"
    >
      {categories.map((category) => (
        <CategoryItem key={category.id} category={category} tone={tone} />
      ))}
    </ScrollView>
  );
});

function CategoryItem({ category, tone }: { category: Category; tone: 'light' | 'alt' }) {
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
          <View
            style={[
              styles.disc,
              { backgroundColor: tone === 'alt' ? colors.white : colors.card },
              pressed && styles.discPressed,
              focusRing.ringStyle,
            ]}
          >
            <Feather name={categoryIcon(category.name)} size={26} color={colors.ink} />
          </View>
          <Text style={styles.label} numberOfLines={2}>
            {category.name}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, gap: 8 },
  item: { width: 88, alignItems: 'center', gap: 8, paddingVertical: 4, minHeight: layout.minTouchTarget },
  disc: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  discPressed: { transform: [{ scale: 0.96 }], opacity: 0.85 },
  label: {
    fontFamily: fonts.body.medium,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.12,
    color: colors.ink,
    textAlign: 'center',
  },
});
