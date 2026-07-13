const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export function formatCurrency(amount: number): string {
  return inrFormatter.format(amount);
}

/** Percentage off MRP, rounded down. Returns null when there's nothing to show. */
export function discountPercent(price: number, mrp: number | null): number | null {
  if (!mrp || mrp <= price) return null;
  return Math.floor(((mrp - price) / mrp) * 100);
}
