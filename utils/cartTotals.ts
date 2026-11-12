import type { CartItem } from '@/api/types';

import { roundToPaise } from './format';

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

/**
 * Splits a cart into the lines the dealer pays for and the free GST Benefit
 * scheme lines. Scheme items are priced and taxed separately server-side
 * (they cost the dealer nothing), so they must never reach the totals below.
 */
export function splitCartItems(items: CartItem[]): { regularItems: CartItem[]; schemeItems: CartItem[] } {
  return {
    regularItems: items.filter((item) => !item.isSchemeItem),
    schemeItems: items.filter((item) => item.isSchemeItem),
  };
}

/**
 * Same subtotal/GST/shipping math the cart and checkout screens both need.
 * Mirrors the server (motoxplus-web lib/pricing/compute.ts): each line's GST
 * is rounded to paise on its own and the order GST is the sum of those
 * rounded lines, so the rows shown always add up to the server's total.
 */
export function calculateCartTotals(allItems: CartItem[]): CartTotals {
  const { regularItems: items } = splitCartItems(allItems);
  let rawSubtotal = 0;
  let rawGst = 0;
  for (const item of items) {
    const unitPrice = item.variant?.price ?? item.product.price;
    const lineSubtotal = unitPrice * item.quantity;
    rawSubtotal += lineSubtotal;
    rawGst += roundToPaise((lineSubtotal * item.product.gstRate) / 100);
  }
  const subtotal = roundToPaise(rawSubtotal);
  const gstAmount = roundToPaise(rawGst);
  const taxedTotal = roundToPaise(subtotal + gstAmount);
  const shipping =
    items.length === 0 ? 0 : taxedTotal >= FREE_DELIVERY_THRESHOLD ? 0 : roundToPaise(taxedTotal * SHIPPING_RATE);
  return { subtotal, gstAmount, shipping, grandTotal: roundToPaise(taxedTotal + shipping) };
}
