import type { Product } from '@/api/types';

import { formatCurrency } from './format';
import { sortProducts, type ProductSortOption } from './sortProducts';
import { isOutOfStock } from './stock';

export interface CatalogFilters {
  categorySlug: string | null;
  brand: string | null;
  priceBand: PriceBandId | null;
  inStockOnly: boolean;
  sort: ProductSortOption;
}

export type PriceBandId = 'under500' | '500to2000' | '2000to10000' | 'over10000';

// Dealer price (ex-GST), the same `price` the product card shows.
export const PRICE_BANDS: { id: PriceBandId; label: string; min: number; max: number }[] = [
  { id: 'under500', label: `Under ${formatCurrency(500)}`, min: 0, max: 500 },
  { id: '500to2000', label: `${formatCurrency(500)} – ${formatCurrency(2000)}`, min: 500, max: 2000 },
  { id: '2000to10000', label: `${formatCurrency(2000)} – ${formatCurrency(10000)}`, min: 2000, max: 10000 },
  { id: 'over10000', label: `Over ${formatCurrency(10000)}`, min: 10000, max: Infinity },
];

export function defaultCatalogFilters(categorySlug: string | null = null): CatalogFilters {
  return { categorySlug, brand: null, priceBand: null, inStockOnly: false, sort: 'default' };
}

/** True when anything other than the screen's own fixed category is applied. */
export function hasCatalogFilters(filters: CatalogFilters, baseCategorySlug: string | null = null): boolean {
  return (
    filters.categorySlug !== baseCategorySlug ||
    !!filters.brand ||
    !!filters.priceBand ||
    filters.inStockOnly ||
    filters.sort !== 'default'
  );
}

/** Brands present in the loaded products, A to Z, for the filter sheet. */
export function brandsOf(products: Product[]): string[] {
  const set = new Set<string>();
  for (const p of products) {
    const b = p.brand?.trim();
    if (b) set.add(b);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

export function applyCatalogFilters(products: Product[], filters: CatalogFilters): Product[] {
  const band = filters.priceBand ? PRICE_BANDS.find((b) => b.id === filters.priceBand) : undefined;
  const list = products.filter((p) => {
    if (filters.categorySlug && p.category.slug !== filters.categorySlug) return false;
    if (filters.brand && p.brand?.trim() !== filters.brand) return false;
    if (band && (p.price < band.min || p.price >= band.max)) return false;
    if (filters.inStockOnly && isOutOfStock(p)) return false;
    return true;
  });
  return sortProducts(list, filters.sort);
}
