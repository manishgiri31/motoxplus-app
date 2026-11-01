import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { colors, font, motion, space } from '@/src/theme';
import { HapticService } from '@/utils/haptics';

export interface PaymentOptionRowProps {
  label: string;
  hint: string;
  selected: boolean;
  onSelect: () => void;
}

// Radio row for a GroupedList: title + one-line hint, accent checkmark on the
// trailing edge when selected (the accent is reserved for selected states and
// primary buttons). Press feedback is opacity .6, like every list row.
export function PaymentOptionRow({ label, hint, selected, onSelect }: PaymentOptionRowProps) {
  const reduceMotion = useReduceMotion();

  return (
    <Pressable
      onPress={() => {
        if (!selected) HapticService.light();
        onSelect();
      }}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      accessibilityHint={hint}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.text}>
        <Text style={styles.title} maxFontSizeMultiplier={1.2}>
          {label}
        </Text>
        <Text style={styles.hint} maxFontSizeMultiplier={1.2}>
          {hint}
        </Text>
      </View>
      <View style={styles.checkSlot}>
        {selected && (
          <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(motion.duration.fast)}>
            <Feather name="check" size={22} color={colors.accent} />
          </Animated.View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 64,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  pressed: { opacity: 0.6 },
  text: { flex: 1, gap: 2 },
  title: { ...font(400), fontSize: 17, lineHeight: 22, letterSpacing: -0.34, color: colors.ink },
  hint: { ...font(400), fontSize: 14, lineHeight: 20, color: colors.ink2 },
  checkSlot: { width: 24, alignItems: 'center', justifyContent: 'center' },
});
