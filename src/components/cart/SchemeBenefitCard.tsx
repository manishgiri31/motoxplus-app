import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getErrorMessage } from '@/api/errors';
import { useApplyScheme, useEligibleSchemes } from '@/api/hooks/useSchemes';
import { productService } from '@/api/services/productService';
import type { CartItem, EligibleScheme, Product } from '@/api/types';
import { Button, Card } from '@/src/components/ui';
import { Stepper } from '@/src/components/ui/Stepper';
import { colors, fonts, radii } from '@/src/theme';
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
export function SchemeBenefitCard({
  regularSubtotal,
  appliedSchemeId,
  schemeItems,
  clearedReason,
  onNotify,
}: SchemeBenefitCardProps) {
  const eligibleQuery = useEligibleSchemes(regularSubtotal);
  const applyScheme = useApplyScheme();
  const [sheetOpen, setSheetOpen] = useState(false);

  const activeScheme = eligibleQuery.data?.schemes[0];
  const isApplied = !!appliedSchemeId && schemeItems.length > 0;

  const remove = () => {
    HapticService.light();
    applyScheme.mutate(
      { schemeId: null },
      {
        onSuccess: () => onNotify('GST Benefit removed'),
        onError: (err) => onNotify(getErrorMessage(err, 'Could not remove the GST Benefit')),
      }
    );
  };

  return (
    <View style={styles.wrap}>
      {!!clearedReason && (
        <View style={styles.notice} accessibilityLiveRegion="polite">
          <Feather name="info" size={16} color={colors.muted} />
          <Text style={styles.noticeText}>{clearedReason}</Text>
        </View>
      )}

      {isApplied ? (
        <Card style={styles.appliedCard}>
          <View style={styles.headerRow}>
            <View style={styles.titleRow}>
              <Feather name="gift" size={18} color={colors.success} />
              <Text style={[styles.title, { color: colors.success }]}>GST Benefit applied</Text>
            </View>
            <Pressable
              onPress={remove}
              disabled={applyScheme.isPending}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Remove GST Benefit"
              style={styles.removeHit}
            >
              {applyScheme.isPending ? (
                <ActivityIndicator size="small" color={colors.muted} />
              ) : (
                <Text style={styles.removeLabel}>Remove</Text>
              )}
            </Pressable>
          </View>
          {schemeItems.map((item) => {
            const price = item.variant?.price ?? item.product.price;
            return (
              <View key={item.id} style={styles.appliedRow}>
                <Text style={styles.appliedName} numberOfLines={2}>
                  {item.product.name}
                  {item.variant ? ` (${item.variant.label})` : ''} × {item.quantity}
                </Text>
                <View style={styles.priceCol}>
                  <Text style={styles.struck}>{formatCurrency(price * item.quantity)}</Text>
                  <Text style={styles.free}>FREE</Text>
                </View>
              </View>
            );
          })}
        </Card>
      ) : activeScheme ? (
        <Card style={styles.offerCard}>
          <View style={styles.titleRow}>
            <Feather name="gift" size={18} color={colors.ink} />
            <Text style={styles.title}>Get {formatCurrency(activeScheme.benefit)} of parts free</Text>
          </View>
          <Text style={styles.offerBody}>
            {activeScheme.name}: pick free items worth up to {formatCurrency(activeScheme.benefit)} on this order.
          </Text>
          <Button label="Select free items" variant="ghost" onPress={() => setSheetOpen(true)} />
        </Card>
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
  const insets = useSafeAreaInsets();
  const applyScheme = useApplyScheme();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [selections, setSelections] = useState<Selection[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(handle);
  }, [search]);

  const resultsQuery = useQuery({
    queryKey: ['schemes', 'item-search', debounced],
    queryFn: () => productService.list({ search: debounced, pageSize: 10 }),
    enabled: visible && debounced.length >= 2,
    staleTime: 60_000,
  });

  const selectedTotal = selections.reduce((sum, s) => sum + s.product.price * s.quantity, 0);
  const overBudget = selectedTotal > scheme.benefit;

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
    HapticService.light();
    setSelections((prev) => {
      const existing = prev.find((s) => s.product.id === product.id);
      if (existing) return prev.map((s) => (s.product.id === product.id ? { ...s, quantity: s.quantity + 1 } : s));
      return [...prev, { product, quantity: 1 }];
    });
  };

  const setQuantity = (productId: string, quantity: number) =>
    setSelections((prev) =>
      quantity <= 0 ? prev.filter((s) => s.product.id !== productId) : prev.map((s) => (s.product.id === productId ? { ...s, quantity } : s))
    );

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

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalContainer}>
        <Pressable style={styles.backdrop} onPress={close} accessibilityRole="button" accessibilityLabel="Close" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>Choose free items</Text>
          <Text style={styles.sheetSubtitle}>Up to {formatCurrency(scheme.benefit)} at dealer price. Any unused amount lapses.</Text>

          <View style={styles.searchRow}>
            <Feather name="search" size={18} color={colors.muted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search by name or part number"
              placeholderTextColor={colors.subtle}
              autoCorrect={false}
              style={styles.searchInput}
              accessibilityLabel="Search free products"
            />
            {resultsQuery.isFetching && <ActivityIndicator size="small" color={colors.muted} />}
          </View>

          <ScrollView style={styles.sheetScroll} keyboardShouldPersistTaps="handled">
            {debounced.length >= 2 && !resultsQuery.isFetching && results.length === 0 && (
              <Text style={styles.empty}>
                {resultsQuery.isError ? "Couldn't search right now. Try again." : 'No parts found.'}
              </Text>
            )}
            {results.map((product) => (
              <Pressable
                key={product.id}
                onPress={() => add(product)}
                style={styles.resultRow}
                accessibilityRole="button"
                accessibilityLabel={`Add ${product.name}`}
              >
                <Text style={styles.resultName} numberOfLines={2}>
                  {product.name}
                </Text>
                <Text style={styles.resultPrice}>{formatCurrency(product.price)}</Text>
              </Pressable>
            ))}

            {selections.length > 0 && (
              <View style={styles.selectionBlock}>
                <Text style={styles.selectionHeading}>Selected</Text>
                {selections.map((s) => (
                  <View key={s.product.id} style={styles.selectionRow}>
                    <Text style={styles.selectionName} numberOfLines={2}>
                      {s.product.name}
                    </Text>
                    <Stepper value={s.quantity} onChange={(next) => setQuantity(s.product.id, next)} />
                    <Pressable
                      onPress={() => setQuantity(s.product.id, 0)}
                      hitSlop={10}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${s.product.name}`}
                      style={styles.removeIcon}
                    >
                      <Feather name="x" size={18} color={colors.muted} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Selected value</Text>
            <Text style={[styles.totalValue, overBudget && { color: colors.red }]}>
              {formatCurrency(selectedTotal)} / {formatCurrency(scheme.benefit)}
            </Text>
          </View>
          {overBudget && <Text style={styles.error}>Over the benefit limit — remove or reduce an item.</Text>}
          {error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.actions}>
            <Button
              label="Apply free items"
              variant="brand"
              fullWidth
              loading={applyScheme.isPending}
              disabled={selections.length === 0 || overBudget}
              onPress={apply}
            />
            <Button label="Cancel" variant="ghost" fullWidth onPress={close} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: 16, marginTop: 8, gap: 8 },
  notice: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', padding: 12, borderRadius: radii.sm, backgroundColor: colors.card },
  noticeText: { flex: 1, fontFamily: fonts.body.regular, fontSize: 14, letterSpacing: -0.224, color: colors.muted },
  appliedCard: { backgroundColor: colors.successSoft, gap: 12 },
  offerCard: { gap: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  title: { flex: 1, fontFamily: fonts.display.bold, fontSize: 17, lineHeight: 19, letterSpacing: -0.374, color: colors.ink },
  offerBody: { fontFamily: fonts.body.regular, fontSize: 14, letterSpacing: -0.224, color: colors.muted },
  removeHit: { minHeight: 44, minWidth: 44, alignItems: 'flex-end', justifyContent: 'center' },
  removeLabel: { fontFamily: fonts.body.semiBold, fontSize: 14, letterSpacing: -0.224, color: colors.link },
  appliedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  appliedName: { flex: 1, fontFamily: fonts.body.regular, fontSize: 14, letterSpacing: -0.224, color: colors.ink },
  priceCol: { alignItems: 'flex-end' },
  struck: { fontFamily: fonts.body.regular, fontSize: 12, letterSpacing: -0.12, color: colors.subtle, textDecorationLine: 'line-through' },
  free: { fontFamily: fonts.body.semiBold, fontSize: 14, letterSpacing: -0.224, color: colors.success },

  modalContainer: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    maxHeight: '88%',
    paddingTop: 8,
    paddingHorizontal: 20,
  },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: colors.line, marginVertical: 8 },
  sheetTitle: { fontFamily: fonts.display.bold, fontSize: 21, lineHeight: 23, letterSpacing: -0.315, color: colors.ink },
  sheetSubtitle: { fontFamily: fonts.body.regular, fontSize: 14, letterSpacing: -0.224, color: colors.muted, marginTop: 4, marginBottom: 12 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.input,
    paddingHorizontal: 14,
    minHeight: 48,
    marginBottom: 8,
  },
  searchInput: { flex: 1, fontFamily: fonts.body.regular, fontSize: 17, letterSpacing: -0.374, color: colors.ink, paddingVertical: 12 },
  sheetScroll: { flexGrow: 0, maxHeight: 340 },
  empty: { fontFamily: fonts.body.regular, fontSize: 14, letterSpacing: -0.224, color: colors.muted, paddingVertical: 16, textAlign: 'center' },
  resultRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 48, paddingVertical: 8 },
  resultName: { flex: 1, fontFamily: fonts.body.regular, fontSize: 17, letterSpacing: -0.374, color: colors.ink },
  resultPrice: { fontFamily: fonts.body.medium, fontSize: 14, letterSpacing: -0.224, color: colors.muted },
  selectionBlock: { marginTop: 12, gap: 8 },
  selectionHeading: { fontFamily: fonts.body.semiBold, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.muted },
  selectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  selectionName: { flex: 1, fontFamily: fonts.body.regular, fontSize: 14, letterSpacing: -0.224, color: colors.ink },
  removeIcon: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12 },
  totalLabel: { fontFamily: fonts.body.regular, fontSize: 14, letterSpacing: -0.224, color: colors.muted },
  totalValue: { fontFamily: fonts.body.semiBold, fontSize: 14, letterSpacing: -0.224, color: colors.success },
  error: { fontFamily: fonts.body.regular, fontSize: 14, letterSpacing: -0.224, color: colors.red, marginTop: 8 },
  actions: { gap: 8, marginTop: 16 },
});
