import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';

import { useCategories } from '@/api/hooks/useCategories';
import { useProductSearch } from '@/api/hooks/useProducts';
import type { Category, ProductSuggestion } from '@/api/types';
import { SearchSuggestions } from '@/components/SearchSuggestions';
import { SearchX } from '@/components/icons/SearchX';
import { Image } from '@/components/ui';
import { POPULAR_SEARCHES } from '@/constants/popularSearches';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';
import { Button } from '@/src/components/ui/Button';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { SearchBar } from '@/src/components/ui/SearchBar';
import { Sheet } from '@/src/components/ui/Sheet';
import { Skeleton } from '@/src/components/ui/Skeleton';
import { colors, motion, screenPaddingX, textStyles } from '@/src/theme';
import { useRecentSearchesStore } from '@/stores/recentSearchesStore';
import { getImageSource } from '@/utils/image';

import { SectionError } from './SectionError';

export interface SearchSheetProps {
  visible: boolean;
  onClose: () => void;
}

// Home search: a 90% sheet instead of a new screen. Idle it offers recent and
// popular searches and categories; once there is text it lists live matches,
// and "See all results" hands the text to the full /search screen.
export function SearchSheet({ visible, onClose }: SearchSheetProps) {
  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(query, 300);
  const keyboardHeight = useKeyboardHeight();

  const recentSearches = useRecentSearchesStore((s) => s.queries);
  const recordSearch = useRecentSearchesStore((s) => s.record);
  const removeRecentSearch = useRecentSearchesStore((s) => s.remove);
  const clearRecentSearches = useRecentSearchesStore((s) => s.clear);

  const categoriesQuery = useCategories();
  const suggestedCategories = useMemo(
    () => [...(categoriesQuery.data ?? [])].sort((a, b) => b._count.products - a._count.products).slice(0, 6),
    [categoriesQuery.data]
  );

  const trimmed = query.trim();
  const searching = trimmed.length >= 2;
  const settling = query !== debounced;
  const suggestionsQuery = useProductSearch(debounced);
  const suggestions = suggestionsQuery.data?.suggestions ?? [];
  const loading = settling || suggestionsQuery.isLoading;

  // Dismiss first, navigate once the sheet has slid away.
  const closeThen = (go: () => void) => {
    Keyboard.dismiss();
    onClose();
    setTimeout(go, motion.duration.base + 40);
  };

  const close = () => {
    setQuery('');
    onClose();
  };

  const seeAll = () => {
    recordSearch(query);
    const q = trimmed;
    closeThen(() => router.push({ pathname: '/search', params: { q } }));
  };

  const selectCategory = (category: Category) => closeThen(() => router.push(`/category/${category.slug}`));
  const openProduct = (suggestion: ProductSuggestion) => {
    recordSearch(query);
    closeThen(() => router.push(`/product/${suggestion.id}`));
  };

  return (
    <Sheet visible={visible} onClose={close} title="Search" initialDetent={1}>
      <View style={styles.fill}>
        <SearchBar
          autoFocus
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => {
            if (searching) seeAll();
          }}
          placeholder="Search parts or part number"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.bar}
        />

        {!searching ? (
          <SearchSuggestions
            recentSearches={recentSearches}
            onSelectSearch={(q) => {
              setQuery(q);
              recordSearch(q);
            }}
            onRemoveRecent={removeRecentSearch}
            onClearRecent={clearRecentSearches}
            popularSearches={POPULAR_SEARCHES}
            suggestedCategories={suggestedCategories}
            categoriesLoading={categoriesQuery.isLoading}
            onSelectCategory={selectCategory}
            bottomInset={keyboardHeight}
          />
        ) : loading ? (
          <View style={styles.skeletons} accessibilityLabel="Loading results" accessibilityLiveRegion="polite">
            {Array.from({ length: 5 }).map((_, i) => (
              <View key={i} style={styles.row}>
                <Skeleton width={44} height={44} radius={10} />
                <View style={styles.rowText}>
                  <Skeleton width="70%" height={17} radius={6} />
                  <Skeleton width="45%" height={14} radius={6} />
                </View>
              </View>
            ))}
          </View>
        ) : suggestionsQuery.isError ? (
          <View style={styles.pad}>
            <SectionError what="results" onRetry={() => suggestionsQuery.refetch()} />
          </View>
        ) : (
          <FlatList
            data={suggestions}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={{ paddingBottom: keyboardHeight + 24 }}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => openProduct(item)}
                accessibilityRole="button"
                accessibilityLabel={`${item.name}, ${item.categoryName}, ${item.brand}`}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              >
                <Image source={getImageSource(item.imageUrl)} style={styles.thumb} cachePolicy="memory-disk" />
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                    {item.name}
                  </Text>
                  <Text style={styles.rowMeta} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                    {item.categoryName} · {item.brand}
                  </Text>
                </View>
              </Pressable>
            )}
            ListFooterComponent={
              suggestions.length > 0 ? (
                <View style={styles.footer}>
                  <Button label={`See all results for "${trimmed}"`} variant="link" onPress={seeAll} />
                </View>
              ) : null
            }
            ListEmptyComponent={
              <EmptyState
                iconElement={<SearchX size={48} color={colors.ink3} />}
                title={`No parts match "${trimmed}"`}
                actionLabel="Search the full catalog"
                actionVariant="secondary"
                onAction={seeAll}
                style={styles.empty}
              />
            }
          />
        )}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  bar: { marginHorizontal: screenPaddingX, marginBottom: 8 },
  pad: { paddingTop: 12 },
  skeletons: { paddingTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingHorizontal: screenPaddingX, paddingVertical: 8 },
  pressed: { opacity: 0.6 },
  thumb: { width: 44, height: 44, borderRadius: 10, backgroundColor: colors.bgAlt },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { ...textStyles.headline, fontSize: 17 },
  rowMeta: { ...textStyles.callout },
  footer: { alignItems: 'center', paddingTop: 8 },
  empty: { flex: 0, paddingTop: 48 },
});
