import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/src/theme';
import { formatCurrency } from '@/utils/format';

import { Badge } from './Badge';

export interface BlurredPriceProps {
  price: number;
  isDealerApproved: boolean;
  onPressLogin?: () => void;
  /** 17pt (product tiles) instead of the default 21pt. */
  compact?: boolean;
}

// Redacts digits in-place so the layout matches the real price's width —
// there's no expo-blur in this project, so this stands in for a true blur.
function redact(formatted: string): string {
  return formatted.replace(/[0-9]/g, '•');
}

export function BlurredPrice({ price, isDealerApproved, onPressLogin, compact = false }: BlurredPriceProps) {
  const formatted = formatCurrency(price);

  if (isDealerApproved) {
    return <Text style={[styles.realPrice, compact && styles.compact]}>{formatted}</Text>;
  }

  const handlePress = () => {
    if (onPressLogin) {
      onPressLogin();
    } else {
      router.push('/(auth)/login');
    }
  };

  return (
    <Pressable onPress={handlePress} accessibilityRole="button" accessibilityLabel="Login to view dealer price" style={styles.row}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Text style={[styles.redacted, compact && styles.compact]} allowFontScaling={false}>
          {redact(formatted)}
        </Text>
      </View>
      <Badge label="Login to view dealer price" variant="brand" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  redacted: {
    fontFamily: fonts.display.bold,
    fontSize: 21,
    color: colors.muted,
    letterSpacing: 1,
  },
  compact: { fontSize: 17, letterSpacing: -0.34 },
  realPrice: {
    fontFamily: fonts.display.bold,
    fontSize: 21, letterSpacing: -0.315,
    color: colors.ink,
  },
});
