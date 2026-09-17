'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { AuthCard, ErrorBanner } from '@tedor/ui';
import { resetPasswordSchema } from '@tedor/validation';
import { api } from '../lib/api';

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const parsed = resetPasswordSchema.safeParse({ token, password });
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? 'Password is too weak');
      return;
    }
    setSubmitting(true);
    try {
      await api.resetPassword(parsed.data.token, parsed.data.password);
      setDone(true);
      router.replace('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed');
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <AuthCard title="Password updated" subtitle="You can now sign in with your new password.">
        <p className="muted">
          <Link href="/login">Go to sign in</Link>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Choose a new password">
      {error ? <ErrorBanner message={error} /> : null}
      <form onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="password">New password</label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>
        <button className="btn" type="submit" disabled={submitting}>
          {submitting ? 'Updating…' : 'Set new password'}
        </button>
      </form>
    </AuthCard>
  );
}