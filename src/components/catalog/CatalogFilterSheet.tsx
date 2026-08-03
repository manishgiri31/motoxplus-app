import { Feather } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Category } from '@/api/types';
import { colors, fonts, radii } from '@/src/theme';
import { HapticService } from '@/utils/haptics';
import { PRODUCT_SORT_OPTIONS, type ProductSortOption } from '@/utils/sortProducts';

import { Button } from '../ui/Button';

export interface CatalogFilters {
  categorySlug: string | null;
  inStockOnly: boolean;
  sort: ProductSortOption;
}

export interface CatalogFilterSheetProps {
  visible: boolean;
  categories?: Category[];
  value: CatalogFilters;
  onApply: (filters: CatalogFilters) => void;
  onClose: () => void;
}

export function CatalogFilterSheet({ visible, categories, value, onApply, onClose }: CatalogFilterSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.container}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Filter & sort</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
              <Feather name="x" size={20} color={colors.ink} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {categories && categories.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Category</Text>
                <View style={styles.chipRow}>
                  <Chip
                    label="All"
                    active={value.categorySlug === null}
                    onPress={() => onApply({ ...value, categorySlug: null })}
                  />
                  {categories.map((c) => (
                    <Chip
                      key={c.id}
                      label={c.name}
                      active={value.categorySlug === c.slug}
                      onPress={() => onApply({ ...value, categorySlug: c.slug })}
                    />
                  ))}
                </View>
              </View>
            )}

            <View style={styles.section}>
              <View style={styles.rowBetween}>
                <Text style={styles.sectionTitle}>In stock only</Text>
                <Switch
                  value={value.inStockOnly}
                  onValueChange={(v) => {
                    HapticService.light();
                    onApply({ ...value, inStockOnly: v });
                  }}
                  trackColor={{ false: colors.line, true: colors.red }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sort by</Text>
              {PRODUCT_SORT_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  onPress={() => {
                    HapticService.light();
                    onApply({ ...value, sort: opt.value });
                  }}
                  style={styles.sortRow}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: value.sort === opt.value }}
                >
                  <Text style={styles.sortLabel}>{opt.label}</Text>
                  {value.sort === opt.value && <Feather name="check" size={16} color={colors.red} />}
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <Button label="Done" variant="solid" fullWidth onPress={onClose} style={styles.done} />
        </View>
      </View>
    </Modal>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        HapticService.light();
        onPress();
      }}
      style={[chipStyles.chip, active && chipStyles.chipActive]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[chipStyles.label, active && chipStyles.labelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(23,24,26,0.4)' },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    maxHeight: '85%',
    paddingTop: 8,
    paddingHorizontal: 20,
  },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: colors.line, marginVertical: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  title: { fontFamily: fonts.display.bold, fontSize: 18, color: colors.ink },
  section: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.line },
  sectionTitle: { fontFamily: fonts.body.semiBold, fontSize: 13, color: colors.ink, marginBottom: 12 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  sortLabel: { fontFamily: fonts.body.regular, fontSize: 15, color: colors.ink },
  done: { marginTop: 16 },
});

const chipStyles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipActive: { backgroundColor: colors.redSoft, borderColor: colors.red },
  label: { fontFamily: fonts.body.medium, fontSize: 13, color: colors.ink },
  labelActive: { color: colors.red },
});
