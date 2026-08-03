import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radii } from '@/src/theme';
import { HapticService } from '@/utils/haptics';

export interface StepperProps {
  value: number;
  onChange: (next: number) => void;
  /** Minimum order quantity — also the step size, matching the backend rule
   * that cart quantity must be a multiple of MOQ (see docs/api.md §6). */
  moq?: number;
  max?: number;
  disabled?: boolean;
}

export function Stepper({ value, onChange, moq = 1, max, disabled = false }: StepperProps) {
  const canDecrement = !disabled && value - moq >= moq;
  const canIncrement = !disabled && (max == null || value + moq <= max);

  const decrement = () => {
    if (!canDecrement) return;
    HapticService.light();
    onChange(Math.max(moq, value - moq));
  };

  const increment = () => {
    if (!canIncrement) return;
    HapticService.light();
    onChange(max != null ? Math.min(max, value + moq) : value + moq);
  };

  return (
    <View style={styles.container}>
      <Pressable
        onPress={decrement}
        disabled={!canDecrement}
        accessibilityRole="button"
        accessibilityLabel="Decrease quantity"
        hitSlop={10}
        style={styles.button}
      >
        <Feather name="minus" size={16} color={canDecrement ? colors.ink : colors.line} />
      </Pressable>
      <Text style={styles.value}>{value}</Text>
      <Pressable
        onPress={increment}
        disabled={!canIncrement}
        accessibilityRole="button"
        accessibilityLabel="Increase quantity"
        hitSlop={10}
        style={styles.button}
      >
        <Feather name="plus" size={16} color={canIncrement ? colors.ink : colors.line} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.pill,
  },
  button: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    minWidth: 28,
    textAlign: 'center',
    fontFamily: fonts.mono.medium,
    fontSize: 14,
    color: colors.ink,
  },
});
