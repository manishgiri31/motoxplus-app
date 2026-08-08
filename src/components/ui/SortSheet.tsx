import { Feather } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, radii } from '@/src/theme';
import { HapticService } from '@/utils/haptics';

export interface SortOption<T extends string> {
  value: T;
  label: string;
}

export interface SortSheetProps<T extends string> {
  visible: boolean;
  value: T;
  options: SortOption<T>[];
  onSelect: (value: T) => void;
  onClose: () => void;
}

export function SortSheet<T extends string>({ visible, value, options, onSelect, onClose }: SortSheetProps<T>) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close sort options" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.handle} />
          <Text style={styles.title}>Sort by</Text>
          {options.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => {
                HapticService.light();
                onSelect(opt.value);
                onClose();
              }}
              accessibilityRole="radio"
              accessibilityState={{ checked: value === opt.value }}
              accessibilityLabel={opt.label}
              style={styles.row}
            >
              <Text style={[styles.rowLabel, value === opt.value && styles.rowLabelSelected]}>{opt.label}</Text>
              {value === opt.value && <Feather name="check" size={18} color={colors.red} />}
            </Pressable>
          ))}
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
    paddingTop: 8,
    paddingHorizontal: 20,
  },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: colors.line, marginVertical: 8 },
  title: { fontFamily: fonts.display.bold, fontSize: 18, color: colors.ink, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  rowLabel: { fontFamily: fonts.body.regular, fontSize: 15, color: colors.ink },
  rowLabelSelected: { fontFamily: fonts.body.semiBold },
});
