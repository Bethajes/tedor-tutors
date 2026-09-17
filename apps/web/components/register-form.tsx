'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, CircleAlert, LoaderCircle } from 'lucide-react';
import { ApiConnectionError, ApiError } from '@tedor/api-client';
import { useAuth } from '../lib/auth-context';
import { AuthShell } from './auth/auth-shell';
import { BrandMark } from './auth/brand';
import { ErrorAlert } from './auth/error-alert';
import { PasswordInput } from './auth/password-input';

/** Mirrors the backend RegisterDto so client and server agree on the rules. */
const registerFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120, 'Name must be at most 120 characters'),
  email: z.string().trim().toLowerCase().email('Enter a valid email').max(255),
  phone: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{7,14}$/, 'Enter a valid phone in E.164 format (e.g. +380501234567)')
    .max(20)
    .optional()
    .or(z.literal('')),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters')
    .regex(/[a-zA-Z]/, 'Password must contain a letter')
    .regex(/[0-9]/, 'Password must contain a digit'),
  role: z.enum(['CLIENT', 'TUTOR']),
});

type RegisterFormValues = z.infer<typeof registerFormSchema>;

interface FieldDetail {
  field: string;
  message: string;
}

function fieldDetailsFrom(error: ApiError): FieldDetail[] {
  const details = error.details;
  if (!Array.isArray(details)) return [];
  return details.filter(
    (item): item is FieldDetail =>
      typeof item === 'object' && item !== null && typeof (item as FieldDetail).field === 'string',
  );
}

function resolveErrorMessage(error: unknown): string {
  if (error instanceof ApiConnectionError) return error.message;
  if (error instanceof ApiError) {
    if (error.status === 409) return error.message; // EMAIL_IN_USE / PHONE_IN_USE copy comes from the API
    if (error.status === 429) return 'Too many attempts. Please wait a moment and try again.';
    if (error.status >= 500) return 'Tedor is having trouble right now. Please try again shortly.';
    return error.message;
  }
  return error instanceof Error ? error.message : 'Registration failed. Please try again.';
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p
      id={id}
      role="alert"
      className="animate-alert-in mt-1.5 flex items-center gap-1 text-xs font-medium text-red-600"
    >
      <CircleAlert className="size-3.5 shrink-0" aria-hidden="true" />
      {message}
    </p>
  );
}

const inputClasses = (hasError: boolean) =>
  `w-full rounded-lg border bg-white py-2.5 px-3.5 text-sm text-slate-900 shadow-xs transition-colors placeholder:text-slate-400 focus:ring-2 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 ${
    hasError
      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
      : 'border-slate-300 focus:ring-indigo-500 focus:border-indigo-500'
  }`;

export function RegisterForm() {
  const { register: registerUser } = useAuth();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: { name: '', email: '', phone: '', password: '', role: 'CLIENT' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    setFieldErrors({});

    try {
      await registerUser({
        name: values.name,
        email: values.email,
        ...(values.phone ? { phone: values.phone } : {}),
        password: values.password,
        role: values.role,
      });
      router.replace('/verify-email');
    } catch (err) {
      if (err instanceof ApiError) {
        // Map field-level validation details from the API onto the inputs.
        const mapped: Record<string, string> = {};
        for (const detail of fieldDetailsFrom(err)) {
          if (detail.field in registerFormSchema.shape && !mapped[detail.field]) {
            mapped[detail.field] = detail.message;
          }
        }
        if (Object.keys(mapped).length > 0) {
          setFieldErrors(mapped);
          for (const [field, message] of Object.entries(mapped)) {
            setError(field as keyof RegisterFormValues, { type: 'server', message });
          }
          return;
        }
      }
      setServerError(resolveErrorMessage(err));
    }
  });

  const emailError = errors.email?.message ?? fieldErrors.email;
  const passwordError = errors.password?.message ?? fieldErrors.password;

  return (
    <AuthShell>
      <div className="animate-rise-in rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-8">
        <div className="flex items-center gap-3">
          <BrandMark size="md" />
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">Create your account</h1>
            <p className="mt-0.5 text-sm text-slate-500">Start learning with expert tutors</p>
          </div>
        </div>

        {serverError ? (
          <div className="mt-6">
            <ErrorAlert message={serverError} onDismiss={() => setServerError(null)} autoDismissMs={8000} />
          </div>
        ) : null}

        <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
          <div>
            <label htmlFor="register-name" className="mb-1.5 block text-sm font-medium text-slate-700">
              Full name
            </label>
            <input
              id="register-name"
              type="text"
              autoComplete="name"
              placeholder="Jane Cooper"
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={errors.name ? 'register-name-error' : undefined}
              className={inputClasses(Boolean(errors.name))}
              {...register('name')}
            />
            <FieldError id="register-name-error" message={errors.name?.message} />
          </div>

          <div>
            <label htmlFor="register-email" className="mb-1.5 block text-sm font-medium text-slate-700">
              Email address
            </label>
            <input
              id="register-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              aria-invalid={emailError ? true : undefined}
              aria-describedby={emailError ? 'register-email-error' : undefined}
              className={inputClasses(Boolean(emailError))}
              {...register('email')}
            />
            <FieldError id="register-email-error" message={emailError} />
          </div>

          <div>
            <label htmlFor="register-phone" className="mb-1.5 block text-sm font-medium text-slate-700">
              Phone <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              id="register-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+12025550123"
              aria-invalid={errors.phone ? true : undefined}
              aria-describedby={errors.phone ? 'register-phone-error' : undefined}
              className={inputClasses(Boolean(errors.phone))}
              {...register('phone')}
            />
            <FieldError id="register-phone-error" message={errors.phone?.message} />
          </div>

          <div>
            <label htmlFor="register-password" className="mb-1.5 block text-sm font-medium text-slate-700">
              Password
            </label>
            <PasswordInput
              id="register-password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              aria-invalid={passwordError ? true : undefined}
              aria-describedby={passwordError ? 'register-password-error' : undefined}
              className={passwordError ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-slate-300'}
              {...register('password')}
            />
            <FieldError id="register-password-error" message={passwordError} />
          </div>

          <div>
            <span className="mb-1.5 block text-sm font-medium text-slate-700">I want to…</span>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  { value: 'CLIENT', label: 'Learn', hint: 'Find a tutor' },
                  { value: 'TUTOR', label: 'Teach', hint: 'Offer tutoring' },
                ] as const
              ).map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition-colors has-checked:border-indigo-600 has-checked:bg-indigo-50 has-checked:ring-1 has-checked:ring-indigo-600"
                >
                  <input
                    type="radio"
                    value={option.value}
                    className="mt-0.5 accent-indigo-600"
                    {...register('role')}
                  />
                  <span>
                    <span className="block text-sm font-semibold text-slate-900">{option.label}</span>
                    <span className="block text-xs text-slate-500">{option.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="group flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/30 transition-all hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                Creating account…
              </>
            ) : (
              <>
                Create account
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-semibold text-indigo-600 no-underline transition-colors hover:text-indigo-700 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
