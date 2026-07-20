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
      accessibilityLabel={label}
      // h-9 (36px) is below the 44x44 touch-target minimum — hitSlop extends
      // the tappable area without changing the chip's visual size.
      hitSlop={6}
      className={`h-9 px-md rounded-full border justify-center ${
        selected ? 'bg-secondary border-secondary' : 'bg-card border-border'
      }`}
    >
      <Text className={`text-[13px] font-medium ${selected ? 'text-secondary-foreground' : 'text-text'}`}>
        {label}
      </Text>
    </Pressable>
  );
}
