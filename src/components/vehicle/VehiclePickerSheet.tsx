import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { ChevronRight } from '@/components/icons/ChevronRight';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';
import { colors, screenPaddingX, textStyles } from '@/src/theme';
import { HapticService } from '@/utils/haptics';

import { SearchBar } from '../ui/SearchBar';
import { Sheet } from '../ui/Sheet';

export interface VehiclePickerOption {
  id: string;
  label: string;
}

export interface VehiclePickerSheetProps {
  visible: boolean;
  title: string;
  options: VehiclePickerOption[];
  onSelect: (option: VehiclePickerOption) => void;
  onClose: () => void;
}

// Searchable list of options in a bottom sheet (opens at 50%, drags to 90%).
export function VehiclePickerSheet({ visible, title, options, onSelect, onClose }: VehiclePickerSheetProps) {
  const [query, setQuery] = useState('');
  const keyboardHeight = useKeyboardHeight();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const close = () => {
    setQuery('');
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={close} title={title}>
      <View style={styles.fill}>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder={`Search ${title.toLowerCase()}`}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.search}
        />
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ paddingBottom: keyboardHeight + 24 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                HapticService.light();
                setQuery('');
                onSelect(item);
              }}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <Text style={styles.rowLabel} numberOfLines={2} maxFontSizeMultiplier={1.2}>
                {item.label}
              </Text>
              <ChevronRight size={18} color={colors.ink3} />
            </Pressable>
          )}
          ItemSeparatorComponent={Separator}
          ListEmptyComponent={
            <Text style={styles.empty} maxFontSizeMultiplier={1.2}>
              No matches
            </Text>
          }
        />
      </View>
    </Sheet>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  search: { marginHorizontal: screenPaddingX, marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingHorizontal: screenPaddingX,
    paddingVertical: 8,
  },
  pressed: { opacity: 0.6 },
  rowLabel: { flex: 1, ...textStyles.body },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line, marginLeft: screenPaddingX },
  empty: { ...textStyles.callout, textAlign: 'center', paddingVertical: 32 },
});
