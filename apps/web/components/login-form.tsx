'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, CircleAlert, LoaderCircle, Mail } from 'lucide-react';
import { ApiError } from '@tedor/api-client';
import { useAuth, ROLE_HOME } from '../lib/auth-context';
import { AuthShell } from './auth/auth-shell';
import { BrandMark } from './auth/brand';
import { ErrorAlert } from './auth/error-alert';
import { PasswordInput } from './auth/password-input';
import { loginFormSchema, type LoginFormValues } from './auth/login-schema';

/** Human-friendly copy for backend failure modes. */
const ERROR_COPY: Record<string, string> = {
  INVALID_CREDENTIALS: 'Incorrect email or password. Please try again.',
  TOKEN_INVALID: 'Your session could not be restored. Please sign in again.',
  RATE_LIMITED: 'Too many attempts. Please wait a moment and try again.',
};

const REMEMBER_ME_KEY = 'tedor_remember_email';

function resolveErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (ERROR_COPY[error.code]) return ERROR_COPY[error.code];
    if (error.status === 401) return 'Incorrect email or password. Please try again.';
    if (error.status === 429) return ERROR_COPY.RATE_LIMITED;
    if (error.status >= 500) return 'Tedor is having trouble right now. Please try again shortly.';
  }
  if (error instanceof TypeError) {
    // fetch() throws TypeError when the network itself is unreachable.
    return 'Cannot reach Tedor right now. Check your connection and try again.';
  }
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="animate-alert-in mt-1.5 flex items-center gap-1 text-xs font-medium text-red-600">
      <CircleAlert className="size-3.5 shrink-0" aria-hidden="true" />
      {message}
    </p>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const { login } = useAuth();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  // Prefill the remembered email on mount.
  useEffect(() => {
    const remembered = window.localStorage.getItem(REMEMBER_ME_KEY);
    if (remembered) setValue('email', remembered, { shouldValidate: false });
  }, [setValue]);

  const onSubmit = handleSubmit(async ({ email, password, rememberMe }) => {
    setServerError(null);
    if (rememberMe) {
      window.localStorage.setItem(REMEMBER_ME_KEY, email);
    } else {
      window.localStorage.removeItem(REMEMBER_ME_KEY);
    }

    try {
      const user = await login(email, password);
      const destination =
        next && next.startsWith('/') ? next : user.emailVerified ? ROLE_HOME[user.role] : '/verify-email';
      router.replace(destination);
    } catch (err) {
      setServerError(resolveErrorMessage(err));
      // Keep the form editable so the user can retry immediately.
      reset({ email, password: '', rememberMe });
    }
  });

  return (
    <AuthShell>
      <div className="animate-rise-in rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-8">
        <div className="flex items-center gap-3">
          <BrandMark size="md" />
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">Welcome back</h1>
            <p className="mt-0.5 text-sm text-slate-500">Sign in to continue learning</p>
          </div>
        </div>

        {serverError ? (
          <div className="mt-6">
            <ErrorAlert message={serverError} onDismiss={() => setServerError(null)} autoDismissMs={8000} />
          </div>
        ) : null}

        <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
          <div>
            <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-slate-700">
              Email address
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={errors.email ? 'login-email-error' : undefined}
              className={`w-full rounded-lg border bg-white py-2.5 pr-3.5 pl-3.5 text-sm text-slate-900 shadow-xs transition-colors placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 ${
                errors.email ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-slate-300'
              }`}
              {...register('email')}
            />
            <FieldError id="login-email-error" message={errors.email?.message} />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="login-password" className="block text-sm font-medium text-slate-700">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-indigo-600 no-underline transition-colors hover:text-indigo-700 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <PasswordInput
              id="login-password"
              autoComplete="current-password"
              placeholder="Enter your password"
              aria-invalid={errors.password ? true : undefined}
              aria-describedby={errors.password ? 'login-password-error' : undefined}
              className={errors.password ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-slate-300'}
              {...register('password')}
            />
            <FieldError id="login-password-error" message={errors.password?.message} />
          </div>

          <div className="flex items-center justify-between pt-1">
            <label htmlFor="login-remember" className="flex cursor-pointer items-center gap-2 text-sm text-slate-600 select-none">
              <input
                id="login-remember"
                type="checkbox"
                className="size-4 rounded accent-indigo-600 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                {...register('rememberMe')}
              />
              Remember me
            </label>
            <span className="text-xs text-slate-400">Sessions expire after 30 days</span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="group flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/30 transition-all hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                Signing in…
              </>
            ) : (
              <>
                Sign in
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          New to Tedor?{' '}
          <Link
            href="/register"
            className="font-semibold text-indigo-600 no-underline transition-colors hover:text-indigo-700 hover:underline"
          >
            Create an account
          </Link>
        </p>
      </div>

      {/* Reassurance strip under the card */}
      <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
        <Mail className="size-3.5" aria-hidden="true" />
        <span>Trouble signing in? Contact support@tedortutors.com</span>
      </div>
    </AuthShell>
  );
}
