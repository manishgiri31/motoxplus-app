import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { CartItem } from '@/api/types';
import { TriangleAlert } from '@/components/icons/TriangleAlert';
import { Button, GroupedList, Sheet } from '@/src/components/ui';
import type { SheetDetent } from '@/src/components/ui';
import { colors, font, layout, screenPaddingX, space } from '@/src/theme';

export interface OutOfStockSheetProps {
  visible: boolean;
  items: CartItem[];
  onClose: () => void;
  /** Removes every listed item from the cart. */
  onRemoveAll: () => void;
}

// Shown instead of going to checkout when the cart holds out-of-stock lines.
export function OutOfStockSheet({ visible, items, onClose, onRemoveAll }: OutOfStockSheetProps) {
  const [detent, setDetent] = useState<SheetDetent>('half');

  useEffect(() => {
    if (visible) setDetent('half');
  }, [visible]);

  return (
    <Sheet visible={visible} onClose={onClose} detent={detent} onDetentChange={setDetent} title="Some items are out of stock">
      <View style={styles.body}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.message} maxFontSizeMultiplier={layout.maxFontScale}>
            Remove these items from your cart to continue to checkout.
          </Text>
          <GroupedList>
            {items.map((item) => (
              <View
                key={item.id}
                accessible
                accessibilityLabel={`${item.product.name}${item.variant ? `, ${item.variant.label}` : ''}, out of stock`}
                style={styles.row}
              >
                <Text style={styles.name} numberOfLines={2} maxFontSizeMultiplier={layout.maxFontScale}>
                  {item.product.name}
                  {item.variant ? ` (${item.variant.label})` : ''}
                </Text>
                <View style={styles.warningRow}>
                  <TriangleAlert size={16} color={colors.warning} />
                  <Text style={styles.warning} maxFontSizeMultiplier={layout.maxFontScale}>
                    Out of stock
                  </Text>
                </View>
              </View>
            ))}
          </GroupedList>
        </ScrollView>

        <View style={styles.footer}>
          <Button label="Remove unavailable items" variant="primary" fullWidth onPress={onRemoveAll} />
          <Button label="Review cart" variant="secondary" fullWidth onPress={onClose} />
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: screenPaddingX, paddingBottom: space.xxl, gap: space.lg },
  message: { ...font(400), fontSize: 14, lineHeight: 20, color: colors.ink2 },
  row: { minHeight: 52, justifyContent: 'center', gap: 2, paddingHorizontal: space.lg, paddingVertical: space.md },
  name: { ...font(400), fontSize: 17, lineHeight: 22, letterSpacing: -0.34, color: colors.ink },
  warning: { ...font(600), fontSize: 14, lineHeight: 20, color: colors.warning },
  warningRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footer: {
    paddingHorizontal: screenPaddingX,
    paddingTop: space.md,
    paddingBottom: space.sm,
    gap: space.sm,
    backgroundColor: colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
});
