const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const inrPaiseFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Same rounding the server uses (motoxplus-web lib/utils.ts roundToPaise). */
export function roundToPaise(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * "₹1,235" for whole rupees, "₹1,234.56" otherwise. Never rounds paise away,
 * so the cart, checkout and Razorpay amounts all show the figure the server
 * actually charges.
 */
export function formatCurrency(amount: number): string {
  const paise = roundToPaise(amount);
  return Number.isInteger(paise) ? inrFormatter.format(paise) : inrPaiseFormatter.format(paise);
}

const dateTimeFormatter = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

const dateFormatter = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/** "6 Nov 2026, 10:30 am" — the app's date format plus the time, no seconds. */
export function formatDateTime(iso: string | Date): string {
  return dateTimeFormatter.format(typeof iso === 'string' ? new Date(iso) : iso);
}

/** "6 Nov 2026" — the date format used across the app. */
export function formatDate(iso: string | Date): string {
  return dateFormatter.format(typeof iso === 'string' ? new Date(iso) : iso);
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
