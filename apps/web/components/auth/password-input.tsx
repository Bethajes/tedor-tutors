'use client';

import { forwardRef, useState, type ComponentProps } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export type PasswordInputProps = Omit<ComponentProps<'input'>, 'type'>;

/**
 * Password input with an accessible show/hide toggle. Forwards its ref so
 * react-hook-form can register the underlying input.
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ className = '', ...props }, ref) {
    const [visible, setVisible] = useState(false);

    return (
      <div className="relative">
        <input
          {...props}
          ref={ref}
          type={visible ? 'text' : 'password'}
          className={`w-full rounded-lg border bg-white py-2.5 pr-11 pl-3.5 text-sm text-slate-900 shadow-xs transition-colors placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 ${className}`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          tabIndex={-1}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg border-l border-slate-200 bg-white text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
        >
          {visible ? (
            <EyeOff className="size-4.5" aria-hidden="true" />
          ) : (
            <Eye className="size-4.5" aria-hidden="true" />
          )}
        </button>
      </div>
    );
  },
);
