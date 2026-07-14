import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { FlatList, Modal, Pressable, Text, View } from 'react-native';

import { useThemeColors } from '@/hooks/use-theme-colors';

export interface DropdownOption<T extends string> {
  label: string;
  value: T;
}

interface DropdownProps<T extends string> {
  label?: string;
  placeholder?: string;
  options: DropdownOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  error?: string;
}

export function Dropdown<T extends string>({
  label,
  placeholder = 'Select…',
  options,
  value,
  onChange,
  error,
}: DropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  const colors = useThemeColors();

  return (
    <View className="gap-xs">
      {label && <Text className="text-[13px] font-semibold text-text">{label}</Text>}
      <Pressable
        onPress={() => setOpen(true)}
        className={`flex-row items-center justify-between h-12 rounded-md border px-md ${
          error ? 'border-danger' : 'border-border'
        }`}
      >
        <Text className={`text-[15px] ${selected ? 'text-text' : 'text-muted'}`}>
          {selected ? selected.label : placeholder}
        </Text>
        <Feather name="chevron-down" size={18} color={colors.muted} />
      </Pressable>
      {error && <Text className="text-[12px] text-danger">{error}</Text>}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 bg-black/40 justify-end" onPress={() => setOpen(false)}>
          <Pressable className="bg-card rounded-t-xl max-h-[70%]" onPress={(e) => e.stopPropagation()}>
            <View className="px-lg py-md border-b border-border">
              <Text className="text-[15px] font-semibold text-text">{label ?? placeholder}</Text>
            </View>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                  className={`flex-row items-center justify-between px-lg py-md ${
                    item.value === value ? 'bg-surface' : ''
                  }`}
                >
                  <Text className="text-[15px] text-text">{item.label}</Text>
                  {item.value === value && <Feather name="check" size={18} color={colors.primary} />}
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
