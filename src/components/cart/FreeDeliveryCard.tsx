import { StyleSheet, Text, View } from 'react-native';

import { Truck } from '@/components/icons/Truck';
import { iconSizes } from '@/components/icons/iconSizes';
import { ProgressBar } from '@/src/components/ui';
import { alpha, colors, font, layout, radii, space } from '@/src/theme';
import { FREE_DELIVERY_THRESHOLD } from '@/utils/cartTotals';
import { formatCurrency } from '@/utils/format';

export interface FreeDeliveryCardProps {
  /** Cart total including GST: what the free-delivery threshold is judged against. */
  taxedTotal: number;
}

// Truck + progress toward free delivery at FREE_DELIVERY_THRESHOLD.
export function FreeDeliveryCard({ taxedTotal }: FreeDeliveryCardProps) {
  const unlocked = taxedTotal >= FREE_DELIVERY_THRESHOLD;
  const remaining = Math.max(0, FREE_DELIVERY_THRESHOLD - taxedTotal);
  const message = unlocked
    ? "You've unlocked free delivery"
    : `Add ${formatCurrency(remaining)} more for free delivery`;

  return (
    <View style={styles.card} accessible accessibilityLabel={message}>
      <View style={styles.titleRow}>
        <View style={[styles.iconTile, unlocked && { backgroundColor: alpha(colors.success, 0.12) }]}>
          <Truck size={iconSizes.inline} color={unlocked ? colors.success : colors.ink2} />
        </View>
        <Text style={styles.title} maxFontSizeMultiplier={layout.maxFontScale}>
          {message}
        </Text>
      </View>
      <ProgressBar progress={taxedTotal / FREE_DELIVERY_THRESHOLD} color={unlocked ? colors.success : colors.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.bgAlt, borderRadius: radii.card, padding: space.lg, gap: space.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  iconTile: {
    width: 28,
    height: 28,
    borderRadius: radii.tile,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: alpha(colors.ink, 0.06),
  },
  title: { flex: 1, ...font(600), fontSize: 17, lineHeight: 22, letterSpacing: -0.34, color: colors.ink },
});
