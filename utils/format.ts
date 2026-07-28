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

/**
 * Dealer profile phone numbers can come back with a country code and/or
 * display formatting (e.g. "+91 98765 43210") — strip everything but digits
 * and keep the last 10, matching the bare 10-digit format the checkout form
 * (and the backend's MOBILE_REGEX, see auth/validation.ts) expects.
 */
export function normalizeMobileNumber(raw: string | null | undefined): string {
  const digits = (raw ?? '').replace(/\D/g, '');
  return digits.slice(-10);
}
