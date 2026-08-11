import { z } from 'zod';

// Runtime validation for the handful of responses where a malformed shape
// would be actively dangerous rather than just a broken screen: the auth
// responses gate every screen in the app via auth/access.ts#canAccessDealerApp,
// and the refresh response gets written straight into secure storage as the
// new bearer token. Everything else in api/services/*.ts is still
// TypeScript-annotation-only (see docs/api.md) — this is deliberately scoped
// to the highest-blast-radius endpoints, not a blanket runtime-validate-everything
// pass.
//
// Member lists must mirror the UserRole/DealerStatus unions in api/types.ts —
// z.infer of these is structurally checked against those types at every call
// site, so a drift shows up as a type error, not silently at runtime.

const userRoleSchema = z.enum([
  'GUEST',
  'DEALER',
  'ADMIN',
  'SUPER_ADMIN',
  'VENDOR',
  'STAFF',
  'SALES',
  'SUPPORT',
  'PRODUCTION',
  'DISPATCH',
  'ACCOUNTS',
  'MARKETING',
]);

const dealerStatusSchema = z.enum(['PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED']);

const authUserSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string(),
  role: userRoleSchema,
  emailVerified: z.boolean(),
  mobileVerified: z.boolean(),
  isActive: z.boolean(),
});

const dealerSchema = z
  .object({
    id: z.string(),
    companyName: z.string(),
    ownerName: z.string(),
    phone: z.string(),
    state: z.string(),
    city: z.string(),
    address: z.string().nullable(),
    pincode: z.string().nullable(),
    gstNumber: z.string().nullable(),
    status: dealerStatusSchema,
    creditLimit: z.number(),
  })
  .nullable();

export const loginResponseSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  user: authUserSchema,
  dealer: dealerSchema,
});

export const meResponseSchema = z.object({
  user: authUserSchema,
  dealer: dealerSchema,
});

export const refreshResponseSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
});
