import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import type { Category } from '@/api/types';
import { colors, fonts } from '@/src/theme';

import { Card } from '../ui/Card';
import { MonoLabel } from '../ui/MonoLabel';

export interface CategoryCardProps {
  category: Category;
  onPress?: () => void;
}

// Shared by the home screen's "Browse by category" rail and the Categories
// tab — same MonoLabel prefix + red tick + name + description composition
// wherever a category is shown as a card.
export function CategoryCard({ category, onPress }: CategoryCardProps) {
  return (
    <Card onPress={onPress ?? (() => router.push(`/category/${category.slug}`))} accessibilityLabel={category.name}>
      <View style={styles.top}>
        <MonoLabel>{`MX-${category.slug.slice(0, 3).toUpperCase()}`}</MonoLabel>
        <View style={styles.tick} />
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {category.name}
      </Text>
      {!!category.description && (
        <Text style={styles.description} numberOfLines={1}>
          {category.description}
        </Text>
      )}
      <Text style={styles.count}>{category._count.products} products</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  tick: { width: 14, height: 2, borderRadius: 1, backgroundColor: colors.red },
  name: { fontFamily: fonts.display.bold, fontSize: 15, color: colors.ink, marginBottom: 2 },
  description: { fontFamily: fonts.body.regular, fontSize: 12.5, color: colors.muted },
  count: { fontFamily: fonts.body.regular, fontSize: 12, color: colors.muted, marginTop: 6 },
});
