import type { Category } from '@/api/types';
import { PRODUCT_SORT_OPTIONS, type ProductSortOption } from '@/utils/sortProducts';

import { Button } from '../ui/Button';
import { GroupedList } from '../ui/GroupedList';
import { Sheet } from '../ui/Sheet';
import { CheckRow, SwitchRow } from '../ui/SelectRows';

export interface CatalogFilters {
  categorySlug: string | null;
  inStockOnly: boolean;
  sort: ProductSortOption;
}

export interface CatalogFilterSheetProps {
  visible: boolean;
  categories?: Category[];
  value: CatalogFilters;
  onApply: (filters: CatalogFilters) => void;
  onClose: () => void;
}

// "Filter & Sort" bottom sheet. Opens at the 50% detent (drag up for 90%).
// Every change is applied immediately; "Done" just closes the sheet.
export function CatalogFilterSheet({ visible, categories, value, onApply, onClose }: CatalogFilterSheetProps) {
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
