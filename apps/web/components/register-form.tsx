'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { AuthCard, ErrorBanner } from '@tedor/ui';
import { registerSchema } from '@tedor/validation';
import { useAuth } from '../lib/auth-context';

export function RegisterForm() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'CLIENT' as 'CLIENT' | 'TUTOR',
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update<Field extends keyof typeof form>(field: Field, value: (typeof form)[Field]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const parsed = registerSchema.safeParse({ ...form, phone: form.phone || undefined });
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? 'Check your input');
      return;
    }
    setSubmitting(true);
    try {
      await register(parsed.data);
      router.replace('/verify-email');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
      setSubmitting(false);
    }
  }

  return (
    <AuthCard title="Create your account" subtitle="Students and tutors welcome.">
      {error ? <ErrorBanner message={error} /> : null}
      <form onSubmit={handleSubmit} noValidate>
        <div className="form-fields">
          <div>
            <label htmlFor="name">Name</label>
            <input
              id="name"
              value={form.name}
              onChange={(event) => update('name', event.target.value)}
              autoComplete="name"
              required
            />
          </div>
          <div>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(event) => update('email', event.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div>
            <label htmlFor="phone">Phone (optional)</label>
            <input
              id="phone"
              inputMode="tel"
              placeholder="+12025550123"
              value={form.phone}
              onChange={(event) => update('phone', event.target.value)}
              autoComplete="tel"
            />
          </div>
          <div>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={form.password}
              onChange={(event) => update('password', event.target.value)}
              autoComplete="new-password"
              required
            />
          </div>
          <div>
            <label htmlFor="role">I am a…</label>
            <select id="role" value={form.role} onChange={(event) => update('role', event.target.value as 'CLIENT' | 'TUTOR')}>
              <option value="CLIENT">Student</option>
              <option value="TUTOR">Tutor</option>
            </select>
          </div>
        </div>
        <button className="btn" type="submit" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p className="muted" style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
        Already have an account? <Link href="/login">Sign in</Link>
      </p>
    </AuthCard>
  );
}