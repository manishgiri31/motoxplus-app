import { Feather } from '@expo/vector-icons';
import { Pressable, ScrollView, Text, View } from 'react-native';

import type { Category } from '@/api/types';
import { Chip } from '@/components/ui';
import { useThemeColors } from '@/hooks/use-theme-colors';

export interface SearchSuggestionsProps {
  recentSearches: string[];
  onSelectSearch: (query: string) => void;
  onClearRecent: () => void;
  popularSearches: string[];
  suggestedCategories: Category[];
  onSelectCategory: (category: Category) => void;
}

export function SearchSuggestions({
  recentSearches,
  onSelectSearch,
  onClearRecent,
  popularSearches,
  suggestedCategories,
  onSelectCategory,
}: SearchSuggestionsProps) {
  const colors = useThemeColors();

  return (
    <ScrollView contentContainerClassName="p-lg gap-2xl" keyboardShouldPersistTaps="handled">
      <View className="items-center gap-md py-lg">
        <View className="w-16 h-16 rounded-full bg-surface items-center justify-center">
          <Feather name="search" size={28} color={colors.muted} />
        </View>
        <View className="items-center gap-xs">
          <Text className="text-[17px] font-semibold text-text text-center">Search the catalog</Text>
          <Text className="text-[14px] text-muted text-center">Try a product name, brand, or part number.</Text>
        </View>
      </View>

      {recentSearches.length > 0 && (
        <View className="gap-md">
          <View className="flex-row items-center justify-between">
            <Text className="text-h3 font-semibold text-text">Recent Searches</Text>
            <Pressable
              onPress={onClearRecent}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Clear recent searches"
            >
              <Text className="text-[13px] font-medium text-primary">Clear</Text>
            </Pressable>
          </View>
          <View className="flex-row flex-wrap gap-sm">
            {recentSearches.map((q) => (
              <Chip key={q} label={q} onPress={() => onSelectSearch(q)} />
            ))}
          </View>
        </View>
      )}

      <View className="gap-md">
        <Text className="text-h3 font-semibold text-text">Popular Searches</Text>
        <View className="flex-row flex-wrap gap-sm">
          {popularSearches.map((q) => (
            <Chip key={q} label={q} onPress={() => onSelectSearch(q)} />
          ))}
        </View>
      </View>

      {suggestedCategories.length > 0 && (
        <View className="gap-md">
          <Text className="text-h3 font-semibold text-text">Suggested Categories</Text>
          <View className="flex-row flex-wrap gap-sm">
            {suggestedCategories.map((category) => (
              <Chip key={category.id} label={category.name} onPress={() => onSelectCategory(category)} />
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}
