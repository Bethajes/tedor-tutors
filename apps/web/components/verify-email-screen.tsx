'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CircleAlert, LoaderCircle } from 'lucide-react';
import { ApiError } from '@tedor/api-client';
import { verifyEmailSchema, type VerifyEmailInput } from '@tedor/validation';
import { api } from '../lib/api';
import { tokenStorage } from '../lib/token-storage';
import { AuthShell } from './auth/auth-shell';
import { BrandMark } from './auth/brand';
import { ErrorAlert } from './auth/error-alert';

const ERROR_COPY: Record<string, string> = {
  CODE_INVALID: 'That code is not valid. Please check your email and try again.',
  CODE_EXPIRED: 'That code has expired. Request a new one below.',
  RATE_LIMITED: 'Too many attempts. Please wait a moment and try again.',
};

function resolveErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (ERROR_COPY[error.code]) return ERROR_COPY[error.code];
    if (error.status === 429) return ERROR_COPY.RATE_LIMITED;
  }
  if (error instanceof TypeError) {
    return 'Cannot reach Tedor right now. Check your connection and try again.';
  }
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

export function VerifyEmailScreen() {
  const router = useRouter();
  const [verifying, setVerifying] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [resending, setResending] = useState(false);
  const [canResend] = useState(tokenStorage.getAccessToken() !== null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VerifyEmailInput>({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: { code: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setVerifying(true);
    setServerError(null);
    try {
      await api.verifyEmail(values.code);
      setVerifying(false);
      router.replace('/login');
    } catch (err) {
      setVerifying(false);
      setServerError(resolveErrorMessage(err));
    }
  });

  async function resend() {
    setResending(true);
    setServerError(null);
    try {
      const email = JSON.parse(String(tokenStorage.getAccessToken()?.split('.')[1] ?? '{}')).email as
        | string
        | undefined;
      if (email) {
        await api.resendVerification(email);
      }
      setSent(true);
    } catch (err) {
      setServerError(resolveErrorMessage(err));
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthShell>
      <div className="animate-rise-in rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-8">
        <div className="flex items-center gap-3">
          <BrandMark size="md" />
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">Verify your email</h1>
            <p className="mt-0.5 text-sm text-slate-500">Enter the code we sent you</p>
          </div>
        </div>

        {serverError ? (
          <div className="mt-6">
            <ErrorAlert message={serverError} onDismiss={() => setServerError(null)} autoDismissMs={8000} />
          </div>
        ) : null}

        {sent ? (
          <p role="status" className="mt-6 rounded-lg bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
            A new code is on its way. Check your inbox (and spam folder), then enter it below.
          </p>
        ) : null}

        {verifying ? (
          <p role="status" className="mt-6 flex items-center gap-2 text-sm text-slate-600">
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> Verifying your code…
          </p>
        ) : (
          <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
            <div>
              <label htmlFor="verify-code" className="mb-1.5 block text-sm font-medium text-slate-700">
                6-digit code
              </label>
              <input
                id="verify-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="123456"
                aria-invalid={errors.code ? true : undefined}
                aria-describedby={errors.code ? 'verify-code-error' : undefined}
                className={`w-full rounded-lg border bg-white py-2.5 px-3.5 text-center text-lg font-semibold tracking-[0.35em] text-slate-900 shadow-xs transition-colors placeholder:font-normal placeholder:text-slate-400 focus:ring-2 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 ${
                  errors.code
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-slate-300 focus:ring-indigo-500 focus:border-indigo-500'
                }`}
                {...register('code')}
              />
              {errors.code ? (
                <p
                  id="verify-code-error"
                  role="alert"
                  className="animate-alert-in mt-1.5 flex items-center gap-1 text-xs font-medium text-red-600"
                >
                  <CircleAlert className="size-3.5 shrink-0" aria-hidden="true" />
                  {errors.code.message}
                </p>
              ) : null}
            </div>

            <button
              type="submit"
              className="w-full cursor-pointer rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
            >
              Verify email
            </button>
          </form>
        )}

        <div className="mt-5 space-y-2 text-sm">
          {canResend ? (
            <button
              type="button"
              onClick={() => void resend()}
              disabled={resending}
              className="cursor-pointer font-medium text-indigo-600 hover:text-indigo-700 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              {resending ? 'Sending…' : "Didn't get a code? Resend"}
            </button>
          ) : null}
          <p className="text-slate-500">
            <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-700">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </AuthShell>
  );
}