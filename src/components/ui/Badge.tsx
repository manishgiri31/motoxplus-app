import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radii } from '@/src/theme';

export type BadgeVariant = 'neutral' | 'brand' | 'success' | 'info';

export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

// success/info tints are status colors, not part of the surface palette, so
// they live here rather than in the neutral token set.
const variantStyles: Record<BadgeVariant, { background: string; border?: string; text: string }> = {
  neutral: { background: colors.paper, border: colors.line, text: colors.muted },
  brand: { background: colors.card, text: colors.ink },
  success: { background: colors.successSoft, text: colors.success },
  info: { background: colors.infoSoft, text: colors.ink2 },
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
    fontSize: 12, letterSpacing: -0.12,
    lineHeight: 16,
  },
});
