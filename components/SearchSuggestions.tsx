import { Feather } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Category } from '@/api/types';
import { colors, fonts, radii } from '@/src/theme';

export interface SearchSuggestionsProps {
  recentSearches: string[];
  onSelectSearch: (query: string) => void;
  onClearRecent: () => void;
  popularSearches: string[];
  suggestedCategories: Category[];
  onSelectCategory: (category: Category) => void;
}

function SuggestionChip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.chip} accessibilityRole="button" accessibilityLabel={label} hitSlop={6}>
      <Text style={styles.chipLabel}>{label}</Text>
    </Pressable>
  );
}

export function SearchSuggestions({
  recentSearches,
  onSelectSearch,
  onClearRecent,
  popularSearches,
  suggestedCategories,
  onSelectCategory,
}: SearchSuggestionsProps) {
  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.hero}>
        <View style={styles.iconCircle}>
          <Feather name="search" size={28} color={colors.muted} />
        </View>
        <View style={styles.heroText}>
          <Text style={styles.heroTitle}>Search the catalog</Text>
          <Text style={styles.heroMessage}>Try a product name, brand, or part number.</Text>
        </View>
      </View>

      {recentSearches.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Searches</Text>
            <Pressable onPress={onClearRecent} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear recent searches">
              <Text style={styles.clearLink}>Clear</Text>
            </Pressable>
          </View>
          <View style={styles.chipRow}>
            {recentSearches.map((q) => (
              <SuggestionChip key={q} label={q} onPress={() => onSelectSearch(q)} />
            ))}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Popular Searches</Text>
        <View style={styles.chipRow}>
          {popularSearches.map((q) => (
            <SuggestionChip key={q} label={q} onPress={() => onSelectSearch(q)} />
          ))}
        </View>
      </View>

      {suggestedCategories.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Suggested Categories</Text>
          <View style={styles.chipRow}>
            {suggestedCategories.map((category) => (
              <SuggestionChip key={category.id} label={category.name} onPress={() => onSelectCategory(category)} />
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 32 },
  hero: { alignItems: 'center', gap: 12, paddingVertical: 16 },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: { alignItems: 'center', gap: 4 },
  heroTitle: { fontFamily: fonts.display.bold, fontSize: 17, color: colors.ink, textAlign: 'center' },
  heroMessage: { fontFamily: fonts.body.regular, fontSize: 14, color: colors.muted, textAlign: 'center' },
  section: { gap: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontFamily: fonts.display.bold, fontSize: 16, color: colors.ink },
  clearLink: { fontFamily: fonts.body.semiBold, fontSize: 13, color: colors.red },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipLabel: { fontFamily: fonts.body.medium, fontSize: 13, color: colors.ink },
});
