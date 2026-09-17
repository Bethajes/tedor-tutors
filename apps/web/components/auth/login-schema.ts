import { z } from 'zod';
import { loginSchema } from '@tedor/validation';

/**
 * Client-side validation for the login form. Field-level rules mirror
 * @tedor/validation's shared loginSchema, with two UI-only adjustments:
 * the password requires a minimum length client-side, and the form carries
 * the `rememberMe` checkbox value.
 */
export const loginFormSchema = loginSchema.extend({
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  rememberMe: z.boolean(),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;
