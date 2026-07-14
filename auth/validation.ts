import { z } from 'zod';

// Mirrors the backend's own regexes exactly (motoxplus-web/src/app/api/dealer/register/route.ts,
// src/app/api/auth/register/route.ts) so client-side validation never rejects something the
// server would accept, or vice versa.
export const MOBILE_REGEX = /^[6-9]\d{9}$/;
const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const AADHAAR_REGEX = /^[0-9]{12}$/;
const PINCODE_REGEX = /^[0-9]{6}$/;

export const loginSchema = z.object({
  identifier: z.string().min(3, 'Enter your email or mobile number'),
  password: z.string().min(1, 'Password is required'),
});
export type LoginFormValues = z.infer<typeof loginSchema>;

const optionalMatching = (regex: RegExp, message: string) =>
  z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || regex.test(v), { message });

export const registerSchema = z.object({
  companyName: z.string().min(2, 'Company name is required'),
  ownerName: z.string().min(2, 'Owner name is required'),
  phone: z.string().regex(MOBILE_REGEX, 'Enter a valid 10-digit mobile number'),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  state: z.string().min(2, 'State is required'),
  city: z.string().min(2, 'City is required'),
  gstNumber: optionalMatching(GST_REGEX, 'Enter a valid GST number'),
  panNumber: optionalMatching(PAN_REGEX, 'Enter a valid PAN number'),
  aadhaarNumber: optionalMatching(AADHAAR_REGEX, 'Enter a valid 12-digit Aadhaar number'),
  companyAddress: z.string().optional().or(z.literal('')),
  shopAddress: z.string().optional().or(z.literal('')),
  pincode: optionalMatching(PINCODE_REGEX, 'Enter a valid 6-digit pincode'),
});
export type RegisterFormValues = z.infer<typeof registerSchema>;

export const forgotPasswordRequestSchema = z.object({
  identifier: z.string().min(3, 'Enter your email or mobile number'),
});
export type ForgotPasswordRequestValues = z.infer<typeof forgotPasswordRequestSchema>;

export const otpSchema = z.object({
  otp: z.string().length(6, 'Enter the 6-digit code'),
});
export type OtpFormValues = z.infer<typeof otpSchema>;

export const newPasswordSchema = z
  .object({
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });
export type NewPasswordFormValues = z.infer<typeof newPasswordSchema>;

export const checkoutSchema = z.object({
  deliveryName: z.string().min(2, 'Name is required'),
  deliveryPhone: z.string().regex(MOBILE_REGEX, 'Enter a valid 10-digit mobile number'),
  deliveryAddress: z.string().min(5, 'Address is required'),
  deliveryCity: z.string().min(2, 'City is required'),
  deliveryState: z.string().min(2, 'State is required'),
  deliveryPincode: z.string().regex(PINCODE_REGEX, 'Enter a valid 6-digit pincode'),
  notes: z.string().optional().or(z.literal('')),
});
export type CheckoutFormValues = z.infer<typeof checkoutSchema>;
