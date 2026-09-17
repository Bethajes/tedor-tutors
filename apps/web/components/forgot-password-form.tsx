'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AuthCard, ErrorBanner } from '@tedor/ui';
import { forgotPasswordSchema } from '@tedor/validation';
import { api } from '../lib/api';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? 'Check your email');
      return;
    }
    setSubmitting(true);
    try {
      await api.forgotPassword(parsed.data.email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <AuthCard
        title="Check your email"
        subtitle="If an account exists for that email, we&apos;ve sent a password reset link."
      >
        <p className="muted">
          <Link href="/login">Back to sign in</Link>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Reset your password" subtitle="Enter your account email.">
      {error ? <ErrorBanner message={error} /> : null}
      <form onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        <button className="btn" type="submit" disabled={submitting}>
          {submitting ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
      <p className="muted" style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
        <Link href="/login">Back to sign in</Link>
      </p>
    </AuthCard>
  );
}