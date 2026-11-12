import Feather from '@expo/vector-icons/Feather';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, font, space } from '@/src/theme';
import { HapticService } from '@/utils/haptics';

export interface PayMethodRowProps {
  label: string;
  hint: string;
  /** Amount charged now via this method, shown on the trailing edge. */
  amount: string;
  disabled?: boolean;
  onPress: () => void;
}

// Action row for the "Choose payment method" list: tapping it starts that
// payment straight away (unlike PaymentOptionRow, which only selects).
export function PayMethodRow({ label, hint, amount, disabled = false, onPress }: PayMethodRowProps) {
  return (
    <Pressable
      onPress={() => {
        HapticService.light();
        onPress();
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={`${label}, ${amount} now`}
      accessibilityHint={hint}
      style={({ pressed }) => [styles.row, (pressed || disabled) && styles.dim]}
    >
      <View style={styles.text}>
        <Text style={styles.title} maxFontSizeMultiplier={1.2}>
          {label}
        </Text>
        <Text style={styles.hint} maxFontSizeMultiplier={1.2}>
          {hint}
        </Text>
      </View>
      <Text style={styles.amount} maxFontSizeMultiplier={1.2}>
        {amount}
      </Text>
      <Feather name="chevron-right" size={20} color={colors.ink3} />
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
  dim: { opacity: 0.6 },
  text: { flex: 1, gap: 2 },
  title: { ...font(400), fontSize: 17, lineHeight: 22, letterSpacing: -0.34, color: colors.ink },
  hint: { ...font(400), fontSize: 14, lineHeight: 20, color: colors.ink2 },
  amount: { ...font(600), fontSize: 17, lineHeight: 22, color: colors.ink, fontVariant: ['tabular-nums'] },
});
