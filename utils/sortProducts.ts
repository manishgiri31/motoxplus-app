import type { Product } from '@/api/types';

// GET /api/products has no server-side `sort` param (see docs/api.md §4), so
// this only reorders whatever pages have already been fetched into the
// infinite-query cache — it can't produce a true global sort over products
// not yet loaded. Fine for client-side re-ordering of what's on screen; a
// real "sort the whole catalog" would need a backend `sort` param.
export type ProductSortOption = 'default' | 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc' | 'brand-asc';

export const PRODUCT_SORT_OPTIONS: { value: ProductSortOption; label: string }[] = [
  { value: 'default', label: 'Featured' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'name-asc', label: 'Name: A to Z' },
  { value: 'name-desc', label: 'Name: Z to A' },
  { value: 'brand-asc', label: 'Brand: A to Z' },
];

export function sortProducts(products: Product[], sort: ProductSortOption): Product[] {
  if (sort === 'default') return products;

  const sorted = [...products];
  switch (sort) {
    case 'price-asc':
      sorted.sort((a, b) => a.price - b.price);
      break;
    case 'price-desc':
      sorted.sort((a, b) => b.price - a.price);
      break;
    case 'name-asc':
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'name-desc':
      sorted.sort((a, b) => b.name.localeCompare(a.name));
      break;
    case 'brand-asc':
      sorted.sort((a, b) => a.brand.localeCompare(b.brand));
      break;
  }
  return sorted;
}
