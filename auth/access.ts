import type { AuthUser, Dealer } from '@/api/types';

// Real dealer-application page on the marketing site — motoxplus-web:
// src/app/(public)/become-dealer/page.tsx. Offered from the Access Denied
// screen for accounts that aren't dealers; dealers sign up in the app itself
// (app/(auth)/register.tsx). Keep this in sync if the website ever moves the
// route; never point it at the bare homepage.
export const DEALER_APPLICATION_URL = 'https://motoxplus.com/become-dealer';

export const DEALER_ACCESS_DENIED_MESSAGE =
  'This application is only available for approved MotoXPlus dealers.';

/**
 * Thrown by AuthProvider.login() when credentials are valid but the account
 * fails canAccessDealerApp(). The login screen catches this type specifically
 * to route to the Access Denied screen instead of showing an inline form
 * error alongside the password field.
 */
export class DealerAccessDeniedError extends Error {
  constructor() {
    super(DEALER_ACCESS_DENIED_MESSAGE);
    this.name = 'DealerAccessDeniedError';
  }
}

/**
 * Single authorization gate for the whole app. Every flow that resolves a
 * (user, dealer) pair from the backend — login, session restore on cold
 * start, manual refreshUser(), and any future entry point (deep links,
 * biometric unlock, push-notification taps, etc.) — MUST call this before
 * treating the session as valid. Do not re-implement this check inline
 * anywhere else; import it instead.
 *
 * Why dealer-only: this app is the ordering tool for MotoXPlus's approved
 * dealer network, not a general storefront. Admins/staff run the business
 * from the website back-office and vendors have their own portal — neither
 * belongs in the dealer app, so every non-DEALER role is rejected even
 * though it authenticates successfully against the shared backend.
 *
 * Why ACTIVE still gates the app: signup creates dealers as ACTIVE, but the
 * back-office can move one to PENDING, SUSPENDED or REJECTED afterwards, and
 * this gate is what sends such an account to the Access Denied screen.
 *
 * Why `dealer.status === 'ACTIVE'` specifically (not just role === DEALER):
 * a device can hold a still-valid JWT for a dealer whose status has since
 * moved to PENDING (application not yet approved), SUSPENDED, or REJECTED —
 * re-checking status on every entry point, not just role, closes that gap.
 */
export function canAccessDealerApp(user: AuthUser | null, dealer: Dealer | null): boolean {
  return !!user && user.role === 'DEALER' && !!dealer && dealer.status === 'ACTIVE';
}
