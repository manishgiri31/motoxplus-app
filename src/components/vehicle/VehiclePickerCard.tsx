import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useVehicleTaxonomy } from '@/api/hooks/useVehicles';
import type { VehicleTaxonomyVariant } from '@/api/types';
import { Bike } from '@/components/icons/Bike';
import { ChevronRight } from '@/components/icons/ChevronRight';
import { iconSizes } from '@/components/icons/iconSizes';
import { useFocusRing } from '@/hooks/use-focus-ring';
import { alpha, colors, font, radii, textStyles } from '@/src/theme';
import { useVehicleStore } from '@/stores/vehicleStore';
import { HapticService } from '@/utils/haptics';

import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { VehiclePickerSheet, type VehiclePickerOption } from './VehiclePickerSheet';

type Step = 'brand' | 'model' | 'variant' | null;

const ON_DARK_HAIRLINE = alpha(colors.white, 0.16);

function formatVariantLabel(variant: VehicleTaxonomyVariant): string {
  const yearPart = variant.yearFrom
    ? variant.yearTo && variant.yearTo !== variant.yearFrom
      ? `${variant.yearFrom}–${variant.yearTo}`
      : `${variant.yearFrom}`
    : null;
  return [yearPart, variant.generationName, variant.name].filter(Boolean).join(' · ') || variant.name;
}

// Dark ink card on the home screen: pick Brand, Model and Year · Variant (each
// row opens a sheet), then jump to the compatible parts.
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

  const header = (
    <View style={styles.header}>
      <Bike size={28} color={colors.white} />
      <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={1.2}>
        Shop by vehicle
      </Text>
    </View>
  );

  if (taxonomy.isLoading) {
    return (
      <View style={styles.card} accessibilityLabel="Loading vehicles" accessibilityLiveRegion="polite">
        {header}
        <View style={styles.skeletonRows}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.skeletonRow}>
              <Skeleton width="45%" height={17} radius={6} style={styles.skeletonOnDark} />
            </View>
          ))}
        </View>
        <Skeleton height={50} radius={radii.pill} style={styles.skeletonOnDark} />
      </View>
    );
  }

  if (taxonomy.isError) {
    return (
      <View style={styles.card}>
        {header}
        <View style={styles.error} accessibilityLiveRegion="polite">
          <Text style={styles.errorText} maxFontSizeMultiplier={1.2}>
            Couldn&apos;t load vehicles
          </Text>
          <Button label="Retry" variant="light" onPress={() => taxonomy.refetch()} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {header}

      <View>
        <SelectorRow title="Brand" value={brand?.name} onPress={() => setOpenStep('brand')} />
        <SelectorRow title="Model" value={model?.name} disabled={!brand} onPress={() => setOpenStep('model')} />
        <SelectorRow
          title="Year · Variant"
          value={variant ? formatVariantLabel(variant) : undefined}
          disabled={!model}
          onPress={() => setOpenStep('variant')}
          last
        />
      </View>

      <Button label="Show compatible parts" variant="light" fullWidth disabled={!canSubmit} onPress={handleSubmit} />

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
  const focusRing = useFocusRing();
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      onFocus={focusRing.onFocus}
      onBlur={focusRing.onBlur}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${title}${value ? `, ${value}` : ', not selected'}`}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        rowStyles.row,
        !last && rowStyles.divider,
        disabled && rowStyles.disabled,
        pressed && rowStyles.pressed,
        focusRing.ringStyle,
      ]}
    >
      <View style={rowStyles.text}>
        <Text style={rowStyles.title} maxFontSizeMultiplier={1.2}>
          {title}
        </Text>
        <Text style={rowStyles.value} numberOfLines={1} maxFontSizeMultiplier={1.2}>
          {value ?? 'Select'}
        </Text>
      </View>
      <ChevronRight size={iconSizes.inline} color={colors.onDarkMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 16,
    padding: 20,
    marginHorizontal: 20,
    borderRadius: radii.card,
    backgroundColor: colors.inkSurface,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { ...textStyles.cardTitle, color: colors.white },
  error: { alignItems: 'center', gap: 12, paddingVertical: 12 },
  errorText: { ...textStyles.callout, color: colors.onDarkMuted },
  skeletonRows: { gap: 4 },
  skeletonRow: { height: 56, justifyContent: 'center' },
  skeletonOnDark: { backgroundColor: alpha(colors.white, 0.12) },
});

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 8 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: ON_DARK_HAIRLINE },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.6 },
  text: { flex: 1, gap: 2 },
  title: { ...textStyles.caption, color: colors.onDarkMuted },
  value: { ...font(400), fontSize: 17, lineHeight: 22, letterSpacing: -0.34, color: colors.white },
});
