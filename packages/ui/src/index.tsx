import type { ReactNode } from 'react';

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-8" role="status" aria-live="polite">
      <span className="size-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" aria-hidden="true" />
      {label ? <span className="text-sm text-slate-600">{label}</span> : null}
      <span className="sr-only">Loading</span>
    </div>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
      role="alert"
    >
      <p>{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 font-medium text-red-800 underline-offset-2 hover:underline"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
      {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
      <div className="mt-6">{children}</div>
    </div>
  );
}