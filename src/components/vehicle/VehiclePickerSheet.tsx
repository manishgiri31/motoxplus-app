import { Feather } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, radii } from '@/src/theme';
import { HapticService } from '@/utils/haptics';

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

// Modal-based bottom sheet — @gorhom/bottom-sheet isn't a project dependency,
// this is the documented fallback.
export function VehiclePickerSheet({ visible, title, options, onSelect, onClose }: VehiclePickerSheetProps) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.container}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
              <Feather name="x" size={20} color={colors.ink} />
            </Pressable>
          </View>
          <View style={styles.searchRow}>
            <Feather name="search" size={16} color={colors.muted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={`Search ${title.toLowerCase()}`}
              placeholderTextColor={colors.muted}
              style={styles.searchInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            style={styles.list}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  HapticService.light();
                  onSelect(item);
                }}
                style={styles.row}
                accessibilityRole="button"
                accessibilityLabel={item.label}
              >
                <Text style={styles.rowLabel}>{item.label}</Text>
                <Feather name="chevron-right" size={16} color={colors.muted} />
              </Pressable>
            )}
            ListEmptyComponent={<Text style={styles.empty}>No matches</Text>}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(23,24,26,0.4)' },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    maxHeight: '80%',
    paddingTop: 8,
    paddingHorizontal: 20,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: { fontFamily: fonts.display.bold, fontSize: 18, color: colors.ink },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 8,
  },
  searchInput: { flex: 1, fontFamily: fonts.body.regular, fontSize: 15, color: colors.ink },
  list: { maxHeight: 360 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  rowLabel: { fontFamily: fonts.body.regular, fontSize: 15, color: colors.ink },
  empty: { fontFamily: fonts.body.regular, fontSize: 14, color: colors.muted, textAlign: 'center', paddingVertical: 24 },
});
