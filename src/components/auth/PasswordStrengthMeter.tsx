import { StyleSheet, Text, View } from 'react-native';

import type { PasswordStrength } from '@/auth/passwordStrength';
import { colors, font, radii, space } from '@/src/theme';

const LEVEL_COLOR = { 1: colors.red, 2: colors.warning, 3: colors.success } as const;

// Three-segment meter with the verdict beside it. Empty until the dealer types.
export function PasswordStrengthMeter({ strength }: { strength: PasswordStrength }) {
  const tint = strength.level > 0 ? LEVEL_COLOR[strength.level as 1 | 2 | 3] : colors.lineSoft;

  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={strength.label ? `Password strength: ${strength.label}` : 'Password strength'}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.segments}>
        {[1, 2, 3].map((n) => (
          <View key={n} style={[styles.segment, { backgroundColor: n <= strength.level ? tint : colors.lineSoft }]} />
        ))}
      </View>
      <Text style={[styles.label, { color: strength.level > 0 ? tint : colors.ink2 }]} maxFontSizeMultiplier={1.2}>
        {strength.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, minHeight: 20 },
  segments: { flex: 1, flexDirection: 'row', gap: space.xs },
  segment: { flex: 1, height: 4, borderRadius: radii.pill },
  label: { ...font(600), minWidth: 64, textAlign: 'right', fontSize: 12, lineHeight: 16 },
});
