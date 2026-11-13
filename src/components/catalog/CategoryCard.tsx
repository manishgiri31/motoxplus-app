import { router } from 'expo-router';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import type { Category } from '@/api/types';
import { useGridColumns } from '@/hooks/use-grid-columns';
import { colors, layout, screenPaddingX, textStyles } from '@/src/theme';

import { Card } from '../ui/Card';
import { CategoryVisual } from './CategoryGlyph';

export interface CategoryCardProps {
  category: Category;
  onPress?: () => void;
}

export const CATEGORY_GRID_GAP = 12;

// Edge length of a square category card for the current grid: the card is 1:1
// at normal text sizes, and its minHeight (not a fixed aspect ratio) so it can
// grow when Dynamic Type makes the text taller than the square.
export function useCategoryCardSide(): number {
  const { width } = useWindowDimensions();
  const columns = useGridColumns();
  const contentWidth = Math.min(width, layout.contentMaxWidth) - screenPaddingX * 2;
  return Math.floor((contentWidth - CATEGORY_GRID_GAP * (columns - 1)) / columns);
}

// Square bgAlt card: a white icon disc top-left, name and product count
// anchored bottom-left.
export function CategoryCard({ category, onPress }: CategoryCardProps) {
  const side = useCategoryCardSide();
  const count = category._count.products;

  return (
    <Card
      onPress={onPress ?? (() => router.push(`/category/${category.slug}`))}
      accessibilityLabel={`${category.name}, ${count} ${count === 1 ? 'product' : 'products'}`}
      style={[styles.card, { minHeight: side }]}
    >
      <View style={styles.disc}>
        <CategoryVisual category={category} photoSize={48} iconSize={26} color={colors.accent} />
      </View>
      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={2} maxFontSizeMultiplier={1.2}>
          {category.name}
        </Text>
        <Text style={styles.count} maxFontSizeMultiplier={1.2}>
          {count} {count === 1 ? 'product' : 'products'}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, padding: 16, justifyContent: 'space-between', gap: 12 },
  disc: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  text: { gap: 2 },
  name: { ...textStyles.headline },
  count: { ...textStyles.callout },
});
