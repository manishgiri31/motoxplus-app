import { StyleSheet, Text, View } from 'react-native';

import { alpha, colors, font, radii } from '@/src/theme';

export type StatusTone = 'success' | 'warning' | 'danger' | 'neutral';

export interface StatusBadgeProps {
  label: string;
  tone?: StatusTone;
}

const TONE_COLOR: Record<StatusTone, string> = {
  success: colors.success,
  warning: colors.warning,
  danger: colors.red,
  neutral: colors.ink2,
};

// Small pill: 12pt semibold text on a 12% tint of the status color.
export function StatusBadge({ label, tone = 'neutral' }: StatusBadgeProps) {
  const color = TONE_COLOR[tone];
  return (
    <View style={[styles.base, { backgroundColor: alpha(color, 0.12) }]}>
      <Text style={[styles.label, { color }]} maxFontSizeMultiplier={1.2}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  label: { ...font(600), fontSize: 12, lineHeight: 16 },
});
