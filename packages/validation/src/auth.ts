import { z } from 'zod';

const NAME = z.string().trim().min(1, 'Name is required').max(120);
const EMAIL = z.string().trim().toLowerCase().email('Enter a valid email').max(255);
const PHONE = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{7,14}$/, 'Enter a valid phone in E.164 format (e.g. +380501234567)')
  .max(20)
  .optional()
  .or(z.literal(''))
  .nullable();
const PASSWORD = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[a-zA-Z]/, 'Password must contain a letter')
  .regex(/[0-9]/, 'Password must contain a digit');
const ROLE = z.enum(['CLIENT', 'TUTOR']);

export const registerSchema = z.object({
  name: NAME,
  email: EMAIL,
  phone: PHONE.transform((value) => (value ? value : null)),
  password: PASSWORD,
  role: ROLE,
});

export const loginSchema = z.object({
  email: EMAIL,
  password: z.string().min(1, 'Password is required').max(128),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken is required').max(2048),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken is required').max(2048),
});

export const forgotPasswordSchema = z.object({
  email: EMAIL,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'token is required').max(2048),
  password: PASSWORD,
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'token is required').max(2048),
});

export const resendVerificationSchema = z.object({
  email: EMAIL,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'currentPassword is required').max(128),
  newPassword: PASSWORD,
});

export const telegramLinkSchema = z.object({
  initData: z.string().min(1, 'initData is required').max(8192),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type TelegramLinkInput = z.infer<typeof telegramLinkSchema>;