import { StyleSheet, Text, View } from 'react-native';

import { colors, font, space } from '@/src/theme';

export interface SummaryRowProps {
  label: string;
  value: string;
  /** success tints the value (free items); strong is the bold total line. */
  tone?: 'default' | 'success';
  strong?: boolean;
}

// Read-only label / value row for a GroupedList (no chevron, not pressable).
export function SummaryRow({ label, value, tone = 'default', strong = false }: SummaryRowProps) {
  return (
    <View accessible accessibilityLabel={`${label}, ${value}`} style={styles.row}>
      <Text style={[styles.label, strong && styles.strong]} maxFontSizeMultiplier={1.2}>
        {label}
      </Text>
      <Text
        style={[styles.value, strong && styles.strong, tone === 'success' && styles.success]}
        maxFontSizeMultiplier={1.2}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    minHeight: 52,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  label: { flexShrink: 1, ...font(400), fontSize: 17, lineHeight: 22, letterSpacing: -0.34, color: colors.ink },
  value: {
    ...font(400),
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.34,
    color: colors.ink2,
    fontVariant: ['tabular-nums'],
  },
  strong: { ...font(600), color: colors.ink },
  success: { ...font(600), color: colors.success },
});
