import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radii } from '@/src/theme';

export type BadgeVariant = 'neutral' | 'brand' | 'success' | 'info';

export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

// success/info tints aren't part of the core palette (theme colors are
// paper/card/ink/muted/line/red only) — kept local to Badge rather than
// added to src/theme, which stays exactly the spec'd token set.
const variantStyles: Record<BadgeVariant, { background: string; border?: string; text: string }> = {
  neutral: { background: colors.paper, border: colors.line, text: colors.muted },
  brand: { background: colors.redSoft, text: colors.red },
  success: { background: '#EAF7EF', text: '#1C8A4C' },
  info: { background: '#EAF2FB', text: '#2B6CB0' },
};

export function Badge({ label, variant = 'neutral' }: BadgeProps) {
  const tone = variantStyles[variant];
  return (
    <View
      style={[
        styles.base,
        { backgroundColor: tone.background, borderColor: tone.border ?? 'transparent' },
      ]}
    >
      <Text style={[styles.label, { color: tone.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  label: {
    fontFamily: fonts.body.semiBold,
    fontSize: 12,
    lineHeight: 16,
  },
});
