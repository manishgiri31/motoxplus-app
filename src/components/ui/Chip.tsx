import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, fonts, radii } from '@/src/theme';
import { HapticService } from '@/utils/haptics';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

export function Chip({ label, selected = false, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={
        onPress &&
        (() => {
          HapticService.light();
          onPress();
        })
      }
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      // 36px tall is below the 44x44 touch-target minimum — hitSlop extends
      // the tappable area without changing the chip's visual size.
      hitSlop={6}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: { backgroundColor: colors.redSoft, borderColor: colors.red },
  label: { fontFamily: fonts.body.medium, fontSize: 13, color: colors.ink },
  labelSelected: { color: colors.red },
});
