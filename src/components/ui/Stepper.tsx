import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Minus } from '@/components/icons/Minus';
import { Plus } from '@/components/icons/Plus';
import { colors, font, layout, radii } from '@/src/theme';
import { HapticService } from '@/utils/haptics';

export interface StepperProps {
  value: number;
  onChange: (next: number) => void;
  /** Minimum order quantity — also the step size, matching the backend rule
   * that cart quantity must be a multiple of MOQ (see docs/api.md §6). */
  moq?: number;
  max?: number;
  disabled?: boolean;
  /** Names the control for screen readers, e.g. the product name. */
  label?: string;
}

// Pill with minus / count / plus. Minimum and step are both the MOQ. The pill
// is 36pt tall; each button is 44pt wide and gets 4pt of vertical hitSlop so
// the touch target is 44x44.
export function Stepper({ value, onChange, moq = 1, max, disabled = false, label }: StepperProps) {
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
        accessibilityLabel={label ? `Decrease quantity of ${label}` : 'Decrease quantity'}
        accessibilityState={{ disabled: !canDecrement }}
        hitSlop={{ top: 4, bottom: 4 }}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Minus size={16} color={canDecrement ? colors.ink : colors.line} />
      </Pressable>
      <Text style={styles.value} accessibilityLabel={`Quantity ${value}`} maxFontSizeMultiplier={1.2}>
        {value}
      </Text>
      <Pressable
        onPress={increment}
        disabled={!canIncrement}
        accessibilityRole="button"
        accessibilityLabel={label ? `Increase quantity of ${label}` : 'Increase quantity'}
        accessibilityState={{ disabled: !canIncrement }}
        hitSlop={{ top: 4, bottom: 4 }}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Plus size={16} color={canIncrement ? colors.ink : colors.line} />
      </Pressable>
    </View>
  );
}

export const QuantityStepper = Stepper;
export type QuantityStepperProps = StepperProps;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: colors.bgAlt,
  },
  button: { width: layout.minTouchTarget, height: 36, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.6 },
  value: {
    minWidth: 28,
    textAlign: 'center',
    ...font(600),
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.34,
    fontVariant: ['tabular-nums'],
    color: colors.ink,
  },
});
