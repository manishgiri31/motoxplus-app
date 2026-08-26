import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useVehicleTaxonomy } from '@/api/hooks/useVehicles';
import type { VehicleTaxonomyVariant } from '@/api/types';
import { useVehicleStore } from '@/stores/vehicleStore';
import { HapticService } from '@/utils/haptics';

import { colors, fonts, radii } from '@/src/theme';
import { Button } from '../ui';
import { VehiclePickerSheet, type VehiclePickerOption } from './VehiclePickerSheet';

type Step = 'brand' | 'model' | 'variant' | null;

// Muted-on-dark tones — theme.colors.muted is calibrated for the paper
// background, not the dark panel, so this card needs its own light-gray tier.
const MUTED_ON_DARK = '#9A9DA3';
const MUTED_ON_DARK_LABEL = '#7C7F85';

function formatVariantLabel(variant: VehicleTaxonomyVariant): string {
  const yearPart = variant.yearFrom
    ? variant.yearTo && variant.yearTo !== variant.yearFrom
      ? `${variant.yearFrom}–${variant.yearTo}`
      : `${variant.yearFrom}`
    : null;
  return [yearPart, variant.generationName, variant.name].filter(Boolean).join(' · ') || variant.name;
}

export function VehiclePickerCard() {
  const setSelectedVehicle = useVehicleStore((s) => s.setSelectedVehicle);
  const stored = useVehicleStore((s) => s.selectedVehicle);
  const taxonomy = useVehicleTaxonomy();

  const [brandId, setBrandId] = useState<string | null>(stored?.brandId ?? null);
  const [modelId, setModelId] = useState<string | null>(stored?.modelId ?? null);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [openStep, setOpenStep] = useState<Step>(null);

  const brands = useMemo(() => taxonomy.data?.brands ?? [], [taxonomy.data]);
  const brand = useMemo(() => brands.find((b) => b.id === brandId) ?? null, [brands, brandId]);
  const model = useMemo(() => brand?.models.find((m) => m.id === modelId) ?? null, [brand, modelId]);
  const variant = useMemo(() => model?.variants.find((v) => v.id === variantId) ?? null, [model, variantId]);

  // Re-select the previously-chosen variant by slug once its model loads —
  // ids are stable but SelectedVehicle only persists the variant's slug.
  useEffect(() => {
    if (variantId || !stored || !model) return;
    const match = model.variants.find((v) => v.slug === stored.variantSlug);
    if (match) setVariantId(match.id);
  }, [model, stored, variantId]);

  const brandOptions: VehiclePickerOption[] = useMemo(() => brands.map((b) => ({ id: b.id, label: b.name })), [brands]);
  const modelOptions: VehiclePickerOption[] = useMemo(
    () => (brand?.models ?? []).map((m) => ({ id: m.id, label: m.name })),
    [brand]
  );
  const variantOptions: VehiclePickerOption[] = useMemo(
    () => (model?.variants ?? []).map((v) => ({ id: v.id, label: formatVariantLabel(v) })),
    [model]
  );

  const canSubmit = !!brand && !!model && !!variant;

  const handleSubmit = () => {
    if (!brand || !model || !variant) return;
    HapticService.light();
    const variantLabel = formatVariantLabel(variant);
    setSelectedVehicle({
      brandId: brand.id,
      brandName: brand.name,
      modelId: model.id,
      modelName: model.name,
      modelSlug: model.slug,
      variant: variantLabel,
      variantSlug: variant.slug,
    });
    router.push({
      pathname: '/vehicle-parts',
      params: { vehicle: model.slug, variant: variant.slug, label: `${brand.name} ${model.name} · ${variantLabel}` },
    });
  };

  if (taxonomy.isLoading) {
    return (
      <View style={[styles.card, styles.centered]}>
        <ActivityIndicator color="#FFFFFF" />
      </View>
    );
  }

  if (taxonomy.isError) {
    return (
      <View style={[styles.card, styles.centered]}>
        <Text style={styles.errorText}>Couldn&apos;t load the vehicle list.</Text>
        <Button label="Retry" variant="brand" onPress={() => taxonomy.refetch()} style={styles.retryButton} />
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.labelRow}>
        <View style={styles.dot} />
        <Text style={styles.label}>SEARCH BY VEHICLE</Text>
      </View>

      <SelectorRow title="Brand" value={brand?.name} onPress={() => setOpenStep('brand')} />
      <SelectorRow title="Model" value={model?.name} disabled={!brand} onPress={() => setOpenStep('model')} />
      <SelectorRow
        title="Year · Variant"
        value={variant ? formatVariantLabel(variant) : undefined}
        disabled={!model}
        onPress={() => setOpenStep('variant')}
        last
      />

      <Button
        label="Show compatible parts"
        variant="brand"
        fullWidth
        disabled={!canSubmit}
        onPress={handleSubmit}
        style={styles.submit}
      />

      <VehiclePickerSheet
        visible={openStep === 'brand'}
        title="Brand"
        options={brandOptions}
        onSelect={(o) => {
          setBrandId(o.id);
          setModelId(null);
          setVariantId(null);
          setOpenStep(null);
        }}
        onClose={() => setOpenStep(null)}
      />
      <VehiclePickerSheet
        visible={openStep === 'model'}
        title="Model"
        options={modelOptions}
        onSelect={(o) => {
          setModelId(o.id);
          setVariantId(null);
          setOpenStep(null);
        }}
        onClose={() => setOpenStep(null)}
      />
      <VehiclePickerSheet
        visible={openStep === 'variant'}
        title="Year · Variant"
        options={variantOptions}
        onSelect={(o) => {
          setVariantId(o.id);
          setOpenStep(null);
        }}
        onClose={() => setOpenStep(null)}
      />
    </View>
  );
}

function SelectorRow({
  title,
  value,
  disabled,
  onPress,
  last,
}: {
  title: string;
  value?: string;
  disabled?: boolean;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${title}${value ? `, ${value}` : ', not selected'}`}
      style={[rowStyles.row, !last && rowStyles.divider, disabled && rowStyles.disabled]}
    >
      <View>
        <Text style={rowStyles.title}>{title}</Text>
        <Text style={rowStyles.value}>{value ?? 'Select'}</Text>
      </View>
      <Feather name="chevron-right" size={18} color={MUTED_ON_DARK} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.dark,
    borderRadius: radii.lg,
    padding: 20,
  },
  centered: { minHeight: 160, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { fontFamily: fonts.body.regular, fontSize: 13, color: MUTED_ON_DARK, textAlign: 'center' },
  retryButton: { minWidth: 120 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.red },
  label: {
    fontFamily: fonts.mono.medium,
    fontSize: 11,
    letterSpacing: 1.2,
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  submit: { marginTop: 16 },
});

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.darkBorder },
  disabled: { opacity: 0.5 },
  title: {
    fontFamily: fonts.mono.regular,
    fontSize: 11,
    color: MUTED_ON_DARK_LABEL,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  value: { fontFamily: fonts.body.medium, fontSize: 15, color: '#FFFFFF' },
});
