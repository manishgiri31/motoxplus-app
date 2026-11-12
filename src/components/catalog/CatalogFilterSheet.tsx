import type { Category } from '@/api/types';
import { PRICE_BANDS, type CatalogFilters } from '@/utils/catalogFilters';
import { PRODUCT_SORT_OPTIONS } from '@/utils/sortProducts';

import { Button } from '../ui/Button';
import { GroupedList } from '../ui/GroupedList';
import { Sheet } from '../ui/Sheet';
import { CheckRow, SwitchRow } from '../ui/SelectRows';

export type { CatalogFilters } from '@/utils/catalogFilters';

export interface CatalogFilterSheetProps {
  visible: boolean;
  categories?: Category[];
  /** Brands in the loaded results (utils/catalogFilters.ts brandsOf). */
  brands?: string[];
  value: CatalogFilters;
  onApply: (filters: CatalogFilters) => void;
  onClose: () => void;
}

// "Filter & Sort" bottom sheet. Opens at the 50% detent (drag up for 90%).
// Every change is applied immediately; "Done" just closes the sheet.
export function CatalogFilterSheet({ visible, categories, brands, value, onApply, onClose }: CatalogFilterSheetProps) {
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Filter & sort"
      detents={[0.5, 0.9]}
      scrollable
      footer={<Button label="Done" variant="primary" fullWidth onPress={onClose} />}
    >
      <GroupedList>
        <SwitchRow
          title="In stock only"
          value={value.inStockOnly}
          onValueChange={(inStockOnly) => onApply({ ...value, inStockOnly })}
        />
      </GroupedList>

      <GroupedList header="Sort by">
        {PRODUCT_SORT_OPTIONS.map((opt) => (
          <CheckRow
            key={opt.value}
            title={opt.label}
            selected={value.sort === opt.value}
            onPress={() => onApply({ ...value, sort: opt.value })}
          />
        ))}
      </GroupedList>

      <GroupedList header="Price">
        <CheckRow title="Any price" selected={value.priceBand === null} onPress={() => onApply({ ...value, priceBand: null })} />
        {PRICE_BANDS.map((band) => (
          <CheckRow
            key={band.id}
            title={band.label}
            selected={value.priceBand === band.id}
            onPress={() => onApply({ ...value, priceBand: band.id })}
          />
        ))}
      </GroupedList>

      {/* A brand that is selected but no longer in the results (results
          changed) stays listed so it can be cleared. */}
      {brands && (brands.length > 1 || value.brand) && (
        <GroupedList header="Brand">
          <CheckRow title="All brands" selected={value.brand === null} onPress={() => onApply({ ...value, brand: null })} />
          {(value.brand && !brands.includes(value.brand) ? [value.brand, ...brands] : brands).map((b) => (
            <CheckRow key={b} title={b} selected={value.brand === b} onPress={() => onApply({ ...value, brand: b })} />
          ))}
        </GroupedList>
      )}

      {categories && categories.length > 0 && (
        <GroupedList header="Category">
          <CheckRow title="All" selected={value.categorySlug === null} onPress={() => onApply({ ...value, categorySlug: null })} />
          {categories.map((c) => (
            <CheckRow
              key={c.id}
              title={c.name}
              selected={value.categorySlug === c.slug}
              onPress={() => onApply({ ...value, categorySlug: c.slug })}
            />
          ))}
        </GroupedList>
      )}
    </Sheet>
  );
}
