import { Pressable, Text } from 'react-native';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

export function Chip({ label, selected = false, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={`h-9 px-md rounded-full border justify-center ${
        selected ? 'bg-black border-black' : 'bg-white border-graytone-300'
      }`}
    >
      <Text className={`text-[13px] font-medium ${selected ? 'text-white' : 'text-black'}`}>{label}</Text>
    </Pressable>
  );
}
