import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import type { Category } from '@/api/types';
import { colors, fonts } from '@/src/theme';
import { categoryIcon } from '@/utils/categoryIcon';

import { Card } from '../ui/Card';
import { useSectionTone } from '../ui/Section';

export interface CategoryCardProps {
  category: Category;
  onPress?: () => void;
}

// Centered tile: an icon disc, the family name and a quiet product count.
// The disc inverts against the card (white on grey, grey on a white card) via
// the surrounding Section tone.
export function CategoryCard({ category, onPress }: CategoryCardProps) {
  const onAlt = useSectionTone() === 'alt';
  return (
    <Card
      onPress={onPress ?? (() => router.push(`/category/${category.slug}`))}
      accessibilityLabel={`${category.name}, ${category._count.products} products`}
      style={styles.card}
    >
      <View style={[styles.disc, { backgroundColor: onAlt ? colors.card : colors.white }]}>
        <Feather name={categoryIcon(category.name)} size={28} color={colors.ink} />
      </View>
      <Text style={styles.name} numberOfLines={2}>
        {category.name}
      </Text>
      <Text style={styles.count}>
        {category._count.products} {category._count.products === 1 ? 'product' : 'products'}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', gap: 4, minHeight: 168, justifyContent: 'center' },
  disc: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  name: {
    fontFamily: fonts.display.bold,
    fontSize: 17,
    lineHeight: 19,
    letterSpacing: -0.374,
    color: colors.ink,
    textAlign: 'center',
  },
  count: { fontFamily: fonts.body.regular, fontSize: 12, lineHeight: 16, letterSpacing: -0.12, color: colors.muted },
});
