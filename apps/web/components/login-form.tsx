'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { AuthCard, ErrorBanner } from '@tedor/ui';
import { loginSchema } from '@tedor/validation';
import { useAuth, ROLE_HOME } from '../lib/auth-context';

export function LoginForm({ next }: { next?: string }) {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? 'Check your input');
      return;
    }
    setSubmitting(true);
    try {
      const user = await login(parsed.data.email, parsed.data.password);
      const destination =
        next && next.startsWith('/')
          ? next
          : user.emailVerified
            ? ROLE_HOME[user.role]
            : '/verify-email';
      router.replace(destination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setSubmitting(false);
    }
  }

  return (
    <AuthCard title="Sign in to Tedor Path" subtitle="Welcome back!">
      {error ? <ErrorBanner message={error} /> : null}
      <form onSubmit={handleSubmit} noValidate>
        <div className="form-fields">
          <div>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={submitting}
              aria-invalid={error ? true : undefined}
              required
            />
          </div>
          <div>
            <label htmlFor="password">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={submitting}
                aria-invalid={error ? true : undefined}
                required
                style={{ paddingRight: '4.25rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                disabled={submitting}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute',
                  right: '0.5rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  border: 0,
                  background: 'transparent',
                  color: '#1d4ed8',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  padding: '0.25rem 0.5rem',
                }}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
        </div>
        <button className="btn" type="submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p className="muted" style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
        <Link href="/forgot-password">Forgot password?</Link>
        <span style={{ margin: '0 0.5rem' }}>·</span>
        <Link href="/register">Create an account</Link>
      </p>
    </AuthCard>
  );
}