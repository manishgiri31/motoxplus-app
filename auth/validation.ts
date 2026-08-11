import { z } from 'zod';

// Mirrors the backend's own regexes exactly (motoxplus-web/src/app/api/dealer/register/route.ts,
// src/app/api/auth/register/route.ts) so client-side validation never rejects something the
// server would accept, or vice versa.
export const MOBILE_REGEX = /^[6-9]\d{9}$/;
const PINCODE_REGEX = /^[0-9]{6}$/;

// Reused across forms below. Upper bounds exist purely as a client-side
// sanity cap (avoid shipping arbitrarily long strings to the server) — the
// backend remains the authority on what it actually accepts.
const emailField = z.string().trim().toLowerCase().max(254, 'Email is too long').email('Enter a valid email address');
const mobileField = z.string().trim().regex(MOBILE_REGEX, 'Enter a valid 10-digit mobile number');

export const loginSchema = z.object({
  identifier: z.string().trim().min(3, 'Enter your email or mobile number').max(254, 'That value is too long'),
  password: z.string().min(1, 'Password is required').max(128, 'Password is too long'),
});
export type LoginFormValues = z.infer<typeof loginSchema>;

export const forgotPasswordRequestSchema = z.object({
  identifier: z.string().trim().min(3, 'Enter your email or mobile number').max(254, 'That value is too long'),
});
export type ForgotPasswordRequestValues = z.infer<typeof forgotPasswordRequestSchema>;

export const otpSchema = z.object({
  otp: z.string().length(6, 'Enter the 6-digit code'),
});
export type OtpFormValues = z.infer<typeof otpSchema>;

export const newPasswordSchema = z
  .object({
    newPassword: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password is too long'),
    confirmPassword: z.string().min(1, 'Confirm your new password').max(128, 'Password is too long'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });
export type NewPasswordFormValues = z.infer<typeof newPasswordSchema>;

export const checkoutSchema = z.object({
  deliveryName: z.string().trim().min(2, 'Name is required').max(100, 'Name is too long'),
  deliveryPhone: mobileField,
  deliveryAddress: z.string().trim().min(5, 'Address is required').max(300, 'Address is too long'),
  deliveryCity: z.string().trim().min(2, 'City is required').max(100, 'City name is too long'),
  deliveryState: z.string().trim().min(2, 'State is required').max(100, 'State name is too long'),
  deliveryPincode: z.string().regex(PINCODE_REGEX, 'Enter a valid 6-digit pincode'),
  notes: z.string().trim().max(500, 'Notes are too long (max 500 characters)').optional().or(z.literal('')),
});
export type CheckoutFormValues = z.infer<typeof checkoutSchema>;

export const emailSchema = z.object({ email: emailField });
export type EmailFormValues = z.infer<typeof emailSchema>;

export const mobileNumberSchema = z.object({ mobile: mobileField });
export type MobileNumberFormValues = z.infer<typeof mobileNumberSchema>;

// Direct UPI / bank transfer proof-of-payment form (see app/order/[id]/pay-upi.tsx).
export const upiPaymentProofSchema = z.object({
  utrNumber: z
    .string()
    .trim()
    .min(10, 'UTR/reference number must be at least 10 characters')
    .max(40, 'UTR/reference number is too long'),
  payerName: z.string().trim().min(2, 'Name is required').max(100, 'Name is too long'),
  payerEmail: emailField,
  payerPhone: mobileField,
});
export type UpiPaymentProofFormValues = z.infer<typeof upiPaymentProofSchema>;
