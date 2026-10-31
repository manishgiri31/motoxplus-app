import { LOW_STOCK_THRESHOLD } from '@/constants/stock';
import type { Product } from '@/api/types';

// The backend stopped counting stock on plain products: Product.stock is
// deprecated (defaults to 0, no longer maintained) and availability is the
// admin-set Product.stockStatus enum. POST /cart and POST /orders reject
// OUT_OF_STOCK items by that field, so the UI must read the same one.
//
// If a response has no stockStatus (an older backend), fall back to the
// numeric stock so those builds keep behaving as before.
type StockFields = Pick<Product, 'stock' | 'stockStatus'>;

export function isOutOfStock(product: StockFields): boolean {
  if (product.stockStatus) return product.stockStatus === 'OUT_OF_STOCK';
  return (product.stock ?? 0) <= 0;
}

export function isFewLeft(product: StockFields): boolean {
  if (product.stockStatus) return product.stockStatus === 'FEW_LEFT';
  const stock = product.stock ?? 0;
  return stock > 0 && stock <= LOW_STOCK_THRESHOLD;
}

export function stockLabel(product: StockFields): 'Out of stock' | 'Few left' | 'In stock' {
  if (isOutOfStock(product)) return 'Out of stock';
  return isFewLeft(product) ? 'Few left' : 'In stock';
}
