import { apiClient } from '../client';
import { loginResponseSchema, meResponseSchema } from '../schemas';
import type {
  ChangeEmailPayload,
  ChangeEmailResponse,
  ForgotPasswordPayload,
  ForgotPasswordResponse,
  LoginResponse,
  MeResponse,
  MessageResponse,
  ResetPasswordPayload,
  SendEmailVerificationPayload,
  SendMobileOtpPayload,
  SessionsResponse,
  VerifyEmailPayload,
  VerifyForgotPasswordOtpPayload,
  VerifyForgotPasswordOtpResponse,
  VerifyMobilePayload,
} from '../types';

export interface LoginPayload {
  email?: string;
  mobile?: string;
  password: string;
}

export const authService = {
  // Parsed at runtime, not just typed: this response gates every screen in
  // the app via auth/access.ts#canAccessDealerApp, so a malformed body
  // (bad deploy, a renamed field) needs to fail loudly here rather than
  // quietly waving through an unverifiable role/status downstream.
  login: (payload: LoginPayload) =>
    apiClient.post<LoginResponse>('/mobile/auth/login', payload).then((r) => loginResponseSchema.parse(r.data)),

  me: () => apiClient.get<MeResponse>('/mobile/auth/me').then((r) => meResponseSchema.parse(r.data)),

  forgotPassword: (payload: ForgotPasswordPayload) =>
    apiClient.post<ForgotPasswordResponse>('/auth/forgot-password', payload).then((r) => r.data),

  verifyForgotPasswordOtp: (payload: VerifyForgotPasswordOtpPayload) =>
    apiClient
      .post<VerifyForgotPasswordOtpResponse>('/auth/verify-forgot-password-otp', payload)
      .then((r) => r.data),

  resetPassword: (payload: ResetPasswordPayload) =>
    apiClient.post<MessageResponse>('/auth/reset-password', payload).then((r) => r.data),

  logout: () => apiClient.post<MessageResponse>('/auth/logout').then((r) => r.data),

  logoutAll: () => apiClient.post<MessageResponse>('/auth/logout-all').then((r) => r.data),

  sendMobileOtp: (payload: SendMobileOtpPayload) =>
    apiClient.post<MessageResponse>('/auth/send-mobile-otp', payload).then((r) => r.data),

  verifyMobile: (payload: VerifyMobilePayload) =>
    apiClient.post<MessageResponse>('/auth/verify-mobile', payload).then((r) => r.data),

  // Backend now hard-requires emailVerified before cart/order/payment
  // endpoints will succeed — this pair is not optional account hygiene.
  sendEmailVerification: (payload: SendEmailVerificationPayload) =>
    apiClient.post<MessageResponse>('/auth/send-email-verification', payload).then((r) => r.data),

  verifyEmail: (payload: VerifyEmailPayload) =>
    apiClient.post<MessageResponse>('/auth/verify-email', payload).then((r) => r.data),

  changeEmail: (payload: ChangeEmailPayload) =>
    apiClient.post<ChangeEmailResponse>('/auth/change-email', payload).then((r) => r.data),

  getSessions: () => apiClient.get<SessionsResponse>('/auth/sessions').then((r) => r.data),

  revokeSession: (sessionId: string) =>
    apiClient.delete<MessageResponse>('/auth/sessions', { data: { sessionId } }).then((r) => r.data),
};
