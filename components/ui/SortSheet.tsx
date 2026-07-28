import { Feather } from '@expo/vector-icons';
import { Modal, Pressable, Text, View } from 'react-native';

import { useThemeColors } from '@/hooks/use-theme-colors';
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
  const colors = useThemeColors();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        className="flex-1 bg-black/40 justify-end"
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close sort options"
      >
        {/* Swallows taps so they don't bubble to the backdrop Pressable above. */}
        <Pressable className="bg-card rounded-t-xl border-t border-border pb-2xl" onPress={() => {}}>
          <View className="items-center pt-sm pb-md">
            <View className="w-10 h-1 rounded-full bg-border" />
          </View>
          <Text className="text-h3 font-semibold text-text px-lg pb-sm">Sort by</Text>
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
              className="flex-row items-center justify-between px-lg py-md active:bg-surface"
            >
              <Text className={`text-[15px] text-text ${value === opt.value ? 'font-semibold' : ''}`}>{opt.label}</Text>
              {value === opt.value && <Feather name="check" size={18} color={colors.primary} />}
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
