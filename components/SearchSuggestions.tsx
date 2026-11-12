import Feather from '@expo/vector-icons/Feather';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Category } from '@/api/types';
import { Button, Chip, GroupedList, ListRow, Skeleton } from '@/src/components/ui';
import { colors, radii, textStyles } from '@/src/theme';
import { HapticService } from '@/utils/haptics';

export interface SearchSuggestionsProps {
  recentSearches: string[];
  onSelectSearch: (query: string) => void;
  onRemoveRecent: (query: string) => void;
  onClearRecent: () => void;
  popularSearches: string[];
  suggestedCategories: Category[];
  categoriesLoading?: boolean;
  onSelectCategory: (category: Category) => void;
  bottomInset?: number;
}

export function SearchSuggestions({
  recentSearches,
  onSelectSearch,
  onRemoveRecent,
  onClearRecent,
  popularSearches,
  suggestedCategories,
  categoriesLoading = false,
  onSelectCategory,
  bottomInset = 0,
}: SearchSuggestionsProps) {
  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingBottom: bottomInset + 32 }]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      {recentSearches.length > 0 && (
        <View style={styles.section}>
          <View style={[styles.sectionHeader, styles.inset]}>
            <Text style={styles.sectionTitle} accessibilityRole="header" maxFontSizeMultiplier={1.2}>
              Recent
            </Text>
            <Button
              label="Clear"
              variant="link"
              hideChevron
              onPress={onClearRecent}
              accessibilityLabel="Clear recent searches"
            />
          </View>
          <GroupedList style={styles.inset}>
            {recentSearches.map((q) => (
              <RecentRow key={q} query={q} onSelect={onSelectSearch} onRemove={onRemoveRecent} />
            ))}
          </GroupedList>
        </View>
      )}

      {(categoriesLoading || suggestedCategories.length > 0) && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, styles.inset]} accessibilityRole="header" maxFontSizeMultiplier={1.2}>
            Suggested categories
          </Text>
          {categoriesLoading && suggestedCategories.length === 0 ? (
            <View style={styles.chipRow}>
              {[96, 120, 80, 104].map((w, i) => (
                <Skeleton key={i} width={w} height={36} radius={radii.pill} />
              ))}
            </View>
          ) : (
            // Wrapped, not a horizontal scroller: with only a handful of chips
            // the last one stopped at the screen edge and looked cut off.
            <View style={styles.chipWrap}>
              {suggestedCategories.map((category) => (
                <Chip key={category.id} label={category.name} onPress={() => onSelectCategory(category)} />
              ))}
            </View>
          )}
        </View>
      )}

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, styles.inset]} accessibilityRole="header" maxFontSizeMultiplier={1.2}>
          Popular searches
        </Text>
        <View style={styles.chipWrap}>
          {popularSearches.map((q) => (
            <Chip key={q} label={q} onPress={() => onSelectSearch(q)} />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

// One Recent row: a ListRow (clock tile + query) that re-runs the search, with
// its own 44pt "x" button to the right. They're siblings rather than nested
// because ListRow is a single Pressable.
function RecentRow({
  query,
  onSelect,
  onRemove,
}: {
  query: string;
  onSelect: (query: string) => void;
  onRemove: (query: string) => void;
}) {
  return (
    <View style={styles.recentRow}>
      <View style={styles.recentMain}>
        <ListRow
          label={query}
          icon="clock"
          chevron={false}
          onPress={() => onSelect(query)}
          accessibilityLabel={`Search for ${query}`}
        />
      </View>
      <Pressable
        onPress={() => {
          HapticService.light();
          onRemove(query);
        }}
        style={({ pressed }) => [styles.remove, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${query} from recent searches`}
      >
        <Feather name="x" size={18} color={colors.ink3} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 16, gap: 32 },
  section: { gap: 12 },
  inset: { marginHorizontal: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { ...textStyles.cardTitle },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, rowGap: 12, paddingHorizontal: 20 },
  recentRow: { flexDirection: 'row', alignItems: 'center' },
  recentMain: { flex: 1 },
  remove: { width: 52, minHeight: 52, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.6 },
});
