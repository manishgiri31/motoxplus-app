import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getErrorMessage } from '@/api/errors';
import { useApplyScheme, useEligibleSchemes } from '@/api/hooks/useSchemes';
import { productService } from '@/api/services/productService';
import type { CartItem, EligibleScheme, Product } from '@/api/types';
import { Gift } from '@/components/icons/Gift';
import { iconSizes, iconTile } from '@/components/icons/iconSizes';
import { Button, GroupedList, InputField, ListRow, ProgressBar, Sheet, Stepper } from '@/src/components/ui';
import type { SheetDetent } from '@/src/components/ui';
import { alpha, colors, font, layout, radii, screenPaddingX, space } from '@/src/theme';
import { formatCurrency } from '@/utils/format';
import { HapticService } from '@/utils/haptics';

export interface SchemeBenefitCardProps {
  /** Regular (non-scheme) cart subtotal excluding GST: what the scheme is judged against. */
  regularSubtotal: number;
  appliedSchemeId: string | null | undefined;
  /** The free items already added to the cart by an applied scheme. */
  schemeItems: CartItem[];
  /** Why the server silently removed a previously applied scheme, if it did. */
  clearedReason?: string | null;
  onNotify: (message: string) => void;
}

// GST Benefit: once an order clears a scheme's minimum, the dealer can pick
// free parts worth up to the benefit (a % of the order value, capped). One
// scheme applies at a time; the server re-validates the whole selection.
//
// Not applied: a tappable card, "Get ₹X of parts free", that opens the
// "Select free items" sheet. Applied: the same card turns into a status card
// and the free items appear as FREE lines in the cart list (see CartLine).
export function SchemeBenefitCard({
  regularSubtotal,
  appliedSchemeId,
  schemeItems,
  clearedReason,
  onNotify,
}: SchemeBenefitCardProps) {
  const eligibleQuery = useEligibleSchemes(regularSubtotal);
  const [sheetOpen, setSheetOpen] = useState(false);

  const activeScheme = eligibleQuery.data?.schemes[0];
  const isApplied = !!appliedSchemeId && schemeItems.length > 0;
  const claimed = schemeItems.reduce((sum, i) => sum + (i.variant?.price ?? i.product.price) * i.quantity, 0);

  return (
    <View style={styles.wrap}>
      {!!clearedReason && (
        <View style={styles.notice} accessibilityLiveRegion="polite">
          <Feather name="info" size={16} color={colors.ink2} />
          <Text style={styles.noticeText} maxFontSizeMultiplier={layout.maxFontScale}>
            {clearedReason}
          </Text>
        </View>
      )}

      {isApplied ? (
        <View
          style={styles.card}
          accessible
          accessibilityLabel={`GST Benefit applied. ${formatCurrency(claimed)} of parts free.`}
        >
          <View style={styles.titleRow}>
            <View style={styles.iconTile}>
              <Gift size={iconSizes.inList} color={colors.accent} />
            </View>
            <Text style={styles.title} maxFontSizeMultiplier={layout.maxFontScale}>
              GST Benefit applied
            </Text>
          </View>
          <ProgressBar progress={activeScheme ? claimed / activeScheme.benefit : 1} color={colors.success} />
          <Text style={styles.caption} maxFontSizeMultiplier={layout.maxFontScale}>
            {formatCurrency(claimed)} of parts free. Your free items are listed below.
          </Text>
        </View>
      ) : activeScheme ? (
        <Pressable
          onPress={() => {
            HapticService.light();
            setSheetOpen(true);
          }}
          accessibilityRole="button"
          accessibilityLabel={`Get ${formatCurrency(activeScheme.benefit)} of parts free. Select free items.`}
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        >
          <View style={styles.titleRow}>
            <View style={styles.iconTile}>
              <Gift size={iconSizes.inList} color={colors.accent} />
            </View>
            <Text style={styles.title} maxFontSizeMultiplier={layout.maxFontScale}>
              Get {formatCurrency(activeScheme.benefit)} of parts free
            </Text>
            <Feather name="chevron-right" size={18} color={colors.ink3} />
          </View>
          <ProgressBar progress={0} />
          <Text style={styles.caption} maxFontSizeMultiplier={layout.maxFontScale}>
            {activeScheme.name}: pick free items worth up to {formatCurrency(activeScheme.benefit)}.
          </Text>
        </Pressable>
      ) : null}

      {activeScheme && (
        <SchemeItemSheet
          visible={sheetOpen}
          scheme={activeScheme}
          onClose={() => setSheetOpen(false)}
          onApplied={() => {
            setSheetOpen(false);
            onNotify('GST Benefit applied');
          }}
        />
      )}
    </View>
  );
}

interface Selection {
  product: Product;
  quantity: number;
}

function SchemeItemSheet({
  visible,
  scheme,
  onClose,
  onApplied,
}: {
  visible: boolean;
  scheme: EligibleScheme;
  onClose: () => void;
  onApplied: () => void;
}) {
  const applyScheme = useApplyScheme();
  const [detent, setDetent] = useState<SheetDetent>('full');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [selections, setSelections] = useState<Selection[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(handle);
  }, [search]);

  // Always open at the 90% detent.
  useEffect(() => {
    if (visible) setDetent('full');
  }, [visible]);

  const resultsQuery = useQuery({
    queryKey: ['schemes', 'item-search', debounced],
    queryFn: () => productService.list({ search: debounced, pageSize: 10 }),
    enabled: visible && debounced.length >= 2,
    staleTime: 60_000,
  });

  const selectedTotal = selections.reduce((sum, s) => sum + s.product.price * s.quantity, 0);
  const remainingBudget = scheme.benefit - selectedTotal;
  const overBudget = remainingBudget < 0;

  const reset = () => {
    setSearch('');
    setDebounced('');
    setSelections([]);
    setError(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const add = (product: Product) => {
    // Quantities are capped at the benefit limit.
    if (product.price > remainingBudget) {
      HapticService.warning();
      setError(`That would go over the ${formatCurrency(scheme.benefit)} limit.`);
      return;
    }
    HapticService.light();
    setError(null);
    setSelections((prev) => {
      const existing = prev.find((s) => s.product.id === product.id);
      if (existing) return prev.map((s) => (s.product.id === product.id ? { ...s, quantity: s.quantity + 1 } : s));
      return [...prev, { product, quantity: 1 }];
    });
  };

  const setQuantity = (productId: string, quantity: number) => {
    setError(null);
    setSelections((prev) =>
      quantity <= 0 ? prev.filter((s) => s.product.id !== productId) : prev.map((s) => (s.product.id === productId ? { ...s, quantity } : s))
    );
  };

  const apply = () => {
    setError(null);
    applyScheme.mutate(
      {
        schemeId: scheme.id,
        items: selections.map((s) => ({ productId: s.product.id, quantity: s.quantity })),
      },
      {
        onSuccess: () => {
          HapticService.light();
          reset();
          onApplied();
        },
        onError: (err) => setError(getErrorMessage(err, 'Could not apply the GST Benefit. Please review your selection.')),
      }
    );
  };

  const results = resultsQuery.data?.products ?? [];
  const searched = debounced.length >= 2;

  return (
    <Sheet visible={visible} onClose={close} detent={detent} onDetentChange={setDetent} title="Select free items">
      <View style={styles.sheetBody}>
        <ScrollView
          style={styles.sheetScroll}
          contentContainerStyle={styles.sheetContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sheetSubtitle} maxFontSizeMultiplier={layout.maxFontScale}>
            Up to {formatCurrency(scheme.benefit)} at dealer price. Any unused amount lapses.
          </Text>

          <InputField
            placeholder="Search by name or part number"
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Search free products"
            leftElement={<Feather name="search" size={18} color={colors.ink3} />}
            rightElement={resultsQuery.isFetching ? <ActivityIndicator size="small" color={colors.ink3} /> : undefined}
          />

          {searched && !resultsQuery.isFetching && results.length === 0 && (
            <Text style={styles.hint} accessibilityLiveRegion="polite" maxFontSizeMultiplier={layout.maxFontScale}>
              {resultsQuery.isError ? "Couldn't search right now. Try again." : 'No parts found.'}
            </Text>
          )}
          {!searched && selections.length === 0 && (
            <Text style={styles.hint} maxFontSizeMultiplier={layout.maxFontScale}>
              Search for the parts you want for free.
            </Text>
          )}

          {results.length > 0 && (
            <GroupedList>
              {results.map((product) => (
                <ListRow
                  key={product.id}
                  label={product.name}
                  value={formatCurrency(product.price)}
                  onPress={() => add(product)}
                  accessibilityLabel={`Add ${product.name}, ${formatCurrency(product.price)}`}
                />
              ))}
            </GroupedList>
          )}

          {selections.length > 0 && (
            <View style={styles.selectedBlock}>
              <Text style={styles.sectionLabel} maxFontSizeMultiplier={layout.maxFontScale}>
                Selected
              </Text>
              <GroupedList>
                {selections.map((s) => {
                  // Largest quantity that still fits inside the benefit.
                  const others = selectedTotal - s.product.price * s.quantity;
                  const max = s.product.price > 0 ? Math.floor((scheme.benefit - others) / s.product.price) : undefined;
                  return (
                    <View key={s.product.id} style={styles.selectionRow}>
                      <Text style={styles.selectionName} numberOfLines={2} maxFontSizeMultiplier={layout.maxFontScale}>
                        {s.product.name}
                      </Text>
                      <Stepper value={s.quantity} max={max} onChange={(next) => setQuantity(s.product.id, next)} label={s.product.name} />
                      <Pressable
                        onPress={() => setQuantity(s.product.id, 0)}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${s.product.name}`}
                        style={({ pressed }) => [styles.removeIcon, pressed && styles.pressed]}
                      >
                        <Feather name="x" size={18} color={colors.ink2} />
                      </Pressable>
                    </View>
                  );
                })}
              </GroupedList>
            </View>
          )}
        </ScrollView>

        {/* Sticky: value claimed so far and the Apply button. */}
        <View style={styles.footer}>
          <View style={styles.valueRow}>
            <Text style={styles.valueLabel} maxFontSizeMultiplier={layout.maxFontScale}>
              Selected value
            </Text>
            <Text
              style={[styles.valueAmount, overBudget && { color: colors.red }]}
              maxFontSizeMultiplier={layout.maxFontScale}
            >
              {formatCurrency(selectedTotal)} / {formatCurrency(scheme.benefit)}
            </Text>
          </View>
          <ProgressBar
            progress={scheme.benefit > 0 ? selectedTotal / scheme.benefit : 0}
            color={overBudget ? colors.red : colors.accent}
            accessibilityLabel="Benefit used"
          />
          {overBudget && (
            <Text style={styles.error} accessibilityLiveRegion="polite" maxFontSizeMultiplier={layout.maxFontScale}>
              Over the benefit limit. Remove or reduce an item.
            </Text>
          )}
          {!!error && (
            <Text style={styles.error} accessibilityLiveRegion="polite" maxFontSizeMultiplier={layout.maxFontScale}>
              {error}
            </Text>
          )}
          <Button
            label="Apply"
            variant="primary"
            fullWidth
            loading={applyScheme.isPending}
            disabled={selections.length === 0 || overBudget}
            onPress={apply}
          />
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  notice: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start', padding: space.md, borderRadius: radii.sm, backgroundColor: colors.bgAlt },
  noticeText: { flex: 1, ...font(400), fontSize: 14, lineHeight: 20, color: colors.ink2 },
  card: { backgroundColor: colors.bgAlt, borderRadius: radii.card, padding: space.lg, gap: space.md },
  pressed: { opacity: 0.6 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  iconTile: {
    width: 28,
    height: 28,
    borderRadius: radii.tile,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: alpha(colors.accent, iconTile.tint),
  },
  title: { flex: 1, ...font(600), fontSize: 17, lineHeight: 22, letterSpacing: -0.34, color: colors.ink },
  caption: { ...font(400), fontSize: 14, lineHeight: 20, color: colors.ink2 },

  sheetBody: { flex: 1 },
  sheetScroll: { flex: 1 },
  sheetContent: { paddingHorizontal: screenPaddingX, paddingBottom: space.xxl, gap: space.lg },
  sheetSubtitle: { ...font(400), fontSize: 14, lineHeight: 20, color: colors.ink2 },
  hint: { ...font(400), fontSize: 14, lineHeight: 20, color: colors.ink3, textAlign: 'center', paddingVertical: space.lg },
  selectedBlock: { gap: space.sm },
  sectionLabel: { ...font(400), fontSize: 14, lineHeight: 20, color: colors.ink2, paddingHorizontal: space.lg },
  selectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 52,
    paddingLeft: space.lg,
    paddingRight: space.xs,
    paddingVertical: space.sm,
  },
  selectionName: { flex: 1, ...font(400), fontSize: 17, lineHeight: 22, letterSpacing: -0.34, color: colors.ink },
  removeIcon: { width: layout.minTouchTarget, height: layout.minTouchTarget, alignItems: 'center', justifyContent: 'center' },
  footer: {
    paddingHorizontal: screenPaddingX,
    paddingTop: space.md,
    paddingBottom: space.sm,
    gap: space.sm,
    backgroundColor: colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  valueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.md },
  valueLabel: { ...font(400), fontSize: 14, lineHeight: 20, color: colors.ink2 },
  valueAmount: { ...font(600), fontSize: 14, lineHeight: 20, color: colors.ink, fontVariant: ['tabular-nums'] },
  error: { ...font(400), fontSize: 14, lineHeight: 20, color: colors.red },
});
