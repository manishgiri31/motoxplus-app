import { MOBILE_REGEX } from '@/auth/validation';

/**
 * Normalizes an Indian mobile number to its bare 10-digit form ("9876543210").
 * Accepts +91, 91 with the country code, a leading 0, and spaces or hyphens;
 * returns null when the input doesn't resolve to a valid mobile number.
 * Same rules as normalizeIndianMobile in motoxplus-web (src/lib/phone.ts), so
 * what the form accepts is exactly what the server accepts.
 */
export function normalizeIndianMobile(input: string): string | null {
  if (!input) return null;
  let digits = input.trim().replace(/[\s-]/g, '');

  if (digits.startsWith('+91')) {
    digits = digits.slice(3);
  } else if (digits.startsWith('91') && digits.length === 12) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0') && digits.length === 11) {
    digits = digits.slice(1);
  }

  return MOBILE_REGEX.test(digits) ? digits : null;
}
