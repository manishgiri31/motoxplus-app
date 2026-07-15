import { apiClient } from '../client';
import type {
  ForgotPasswordPayload,
  ForgotPasswordResponse,
  LoginResponse,
  MeResponse,
  MessageResponse,
  ResetPasswordPayload,
  SendMobileOtpPayload,
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
  login: (payload: LoginPayload) => {
    // eslint-disable-next-line no-console
    console.log('STEP 4');
    return apiClient.post<LoginResponse>('/mobile/auth/login', payload).then((r) => r.data);
  },

  me: () => apiClient.get<MeResponse>('/mobile/auth/me').then((r) => r.data),

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
};
