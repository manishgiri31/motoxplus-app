import type { CartItem } from '@/api/types';

// Shared by cart.tsx, checkout.tsx, and the home banner's free-delivery
// promo slide — was previously duplicated as a local constant in the first
// two and a bare literal in the third.
export const FREE_DELIVERY_THRESHOLD = 25000;

const SHIPPING_RATE = 0.05;

export interface CartTotals {
  subtotal: number;
  gstAmount: number;
  shipping: number;
  grandTotal: number;
}

/** Same subtotal/GST/shipping math the cart and checkout screens both need. */
export function calculateCartTotals(items: CartItem[]): CartTotals {
  let subtotal = 0;
  let gstAmount = 0;
  for (const item of items) {
    const unitPrice = item.variant?.price ?? item.product.price;
    const lineSubtotal = unitPrice * item.quantity;
    subtotal += lineSubtotal;
    gstAmount += (lineSubtotal * item.product.gstRate) / 100;
  }
  const taxedTotal = subtotal + gstAmount;
  const shipping =
    items.length === 0
      ? 0
      : taxedTotal >= FREE_DELIVERY_THRESHOLD
        ? 0
        : Math.round(taxedTotal * SHIPPING_RATE * 100) / 100;
  return { subtotal, gstAmount, shipping, grandTotal: taxedTotal + shipping };
}
