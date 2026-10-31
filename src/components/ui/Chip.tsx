import { Pressable, StyleSheet, Text } from 'react-native';

import { useFocusRing } from '@/hooks/use-focus-ring';
import { colors, fonts, radii } from '@/src/theme';
import { HapticService } from '@/utils/haptics';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

export function Chip({ label, selected = false, onPress }: ChipProps) {
  const focusRing = useFocusRing();
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
      onFocus={focusRing.onFocus}
      onBlur={focusRing.onBlur}
      style={[styles.chip, selected && styles.chipSelected, focusRing.ringStyle]}
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
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: { backgroundColor: colors.ink },
  label: { fontFamily: fonts.body.medium, fontSize: 14, letterSpacing: -0.224, color: colors.ink },
  labelSelected: { color: colors.white },
});
