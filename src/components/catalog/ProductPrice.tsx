import { StyleSheet, Text, View } from 'react-native';

import { colors, font } from '@/src/theme';
import { discountPercent, formatCurrency } from '@/utils/format';

import { BlurredPrice } from '../ui/BlurredPrice';

export interface ProductPriceProps {
  price: number;
  mrp: number | null;
  isDealerApproved: boolean;
  /** tile: product cards (two fixed lines). detail: the product page's price block. */
  size?: 'tile' | 'detail';
  /** Tile only: line heights are multiplied by this so cards stay a fixed height under Dynamic Type. */
  scale?: number;
}

// Marketplace-style price: the dealer price first and largest, the MRP struck
// through and the saving in green ("23% off"). Unapproved accounts only see
// the redacted price.
//
// The tile version is always two lines (price; MRP + saving), reserving the
// second even when there's no discount, so cards in a grid line up.
export function ProductPrice({ price, mrp, isDealerApproved, size = 'tile', scale = 1 }: ProductPriceProps) {
  const off = discountPercent(price, mrp);
  const label = off !== null ? `${formatCurrency(price)}, MRP ${formatCurrency(mrp as number)}, ${off}% off` : formatCurrency(price);

  if (size === 'detail') {
    if (!isDealerApproved) return <BlurredPrice price={price} isDealerApproved={false} />;
    return (
      <View style={styles.detailRow} accessible accessibilityLabel={label}>
        {off !== null && (
          <Text style={styles.detailOff} maxFontSizeMultiplier={1.2}>
            {`↓${off}%`}
          </Text>
        )}
        {off !== null && (
          <Text style={styles.detailMrp} maxFontSizeMultiplier={1.2}>
            {formatCurrency(mrp as number)}
          </Text>
        )}
        <Text style={styles.detailPrice} maxFontSizeMultiplier={1.2}>
          {formatCurrency(price)}
        </Text>
      </View>
    );
  }

  return (
    <View accessible accessibilityLabel={isDealerApproved ? label : 'Login to view dealer price'}>
      <View style={{ minHeight: 22 * scale, justifyContent: 'center' }}>
        {isDealerApproved ? (
          <Text style={styles.price} numberOfLines={1} maxFontSizeMultiplier={1.2}>
            {formatCurrency(price)}
          </Text>
        ) : (
          <BlurredPrice price={price} isDealerApproved={false} compact />
        )}
      </View>
      <View style={[styles.saveRow, { height: 18 * scale }]}>
        {isDealerApproved && off !== null && (
          <>
            <Text style={styles.mrp} numberOfLines={1} maxFontSizeMultiplier={1.2}>
              {formatCurrency(mrp as number)}
            </Text>
            <Text style={styles.off} numberOfLines={1} maxFontSizeMultiplier={1.2}>
              {`${off}% off`}
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  price: { ...font(700), fontSize: 17, lineHeight: 22, letterSpacing: -0.34, color: colors.ink, fontVariant: ['tabular-nums'] },
  saveRow: { flexDirection: 'row', alignItems: 'center', gap: 6, overflow: 'hidden' },
  mrp: { flexShrink: 1, ...font(400), fontSize: 13, lineHeight: 18, color: colors.ink3, textDecorationLine: 'line-through' },
  off: { ...font(700), fontSize: 13, lineHeight: 18, color: colors.success },

  detailRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', columnGap: 10 },
  detailOff: { ...font(700), fontSize: 21, lineHeight: 28, color: colors.success },
  detailMrp: { ...font(400), fontSize: 17, lineHeight: 22, color: colors.ink3, textDecorationLine: 'line-through' },
  detailPrice: { ...font(700), fontSize: 28, lineHeight: 34, letterSpacing: -0.56, color: colors.ink, fontVariant: ['tabular-nums'] },
});
