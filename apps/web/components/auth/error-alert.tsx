'use client';

import { useEffect } from 'react';
import { CircleAlert, X } from 'lucide-react';

interface ErrorAlertProps {
  message: string;
  onDismiss?: () => void;
  /** Auto-dismiss after this many milliseconds; omit to keep the alert up. */
  autoDismissMs?: number;
}

/**
 * Dismissible, animated error banner shown when authentication fails.
 * Replaces the old static "Server error" text with a styled, accessible
 * alert (role="alert" so screen readers announce it immediately).
 */
export function ErrorAlert({ message, onDismiss, autoDismissMs }: ErrorAlertProps) {
  useEffect(() => {
    if (!autoDismissMs || !onDismiss) return;
    const timer = window.setTimeout(onDismiss, autoDismissMs);
    return () => window.clearTimeout(timer);
  }, [autoDismissMs, onDismiss, message]);

  return (
    <div
      role="alert"
      className="animate-alert-in flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm shadow-xs"
    >
      <CircleAlert className="mt-0.5 size-4.5 shrink-0 text-red-500" aria-hidden="true" />
      <p className="flex-1 leading-relaxed text-red-800">{message}</p>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss error"
          className="-mt-0.5 -mr-1 rounded-md p-1 text-red-400 transition-colors hover:bg-red-100 hover:text-red-600 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:outline-none"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
