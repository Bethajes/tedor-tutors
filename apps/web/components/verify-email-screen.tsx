'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AuthCard, ErrorBanner, Spinner } from '@tedor/ui';
import { api } from '../lib/api';
import { tokenStorage } from '../lib/token-storage';

export function VerifyEmailScreen({ token }: { token?: string }) {
  const [status, setStatus] = useState<'idle' | 'working' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [canResend, setCanResend] = useState(tokenStorage.getAccessToken() !== null);

  useEffect(() => {
    if (!token) {
      setStatus('idle');
      return;
    }
    let cancelled = false;
    setStatus('working');
    setMessage(null);
    api
      .verifyEmail(token)
      .then(() => !cancelled && setStatus('success'))
      .catch((err: Error) => {
        if (!cancelled) {
          setStatus('error');
          setMessage(err.message);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function resend() {
    setStatus('working');
    setMessage(null);
    try {
      const email = JSON.parse(atob(String(tokenStorage.getAccessToken()?.split('.')[1] ?? '')))
        .email as string | undefined;
      if (email) {
        await api.resendVerification(email);
      }
      setStatus('idle');
      setMessage('Verification email sent. Check your inbox.');
    } catch {
      setStatus('error');
      setMessage('Could not resend. Please try again later.');
    }
  }

  return (
    <AuthCard title="Verify your email" subtitle="Confirm your address to activate your account.">
      {status === 'working' ? <Spinner label="Verifying…" /> : null}
      {status === 'success' ? (
        <p role="status">
          Your email is verified. <Link href="/login">Go to sign in</Link>
        </p>
      ) : null}
      {status === 'error' && message ? <ErrorBanner message={message} /> : null}
      {status === 'idle' ? (
        <div>
          <p className="muted">
            We sent you a verification link. Check your inbox, or request a new one below.
          </p>
          {message ? <p role="status">{message}</p> : null}
          {canResend ? (
            <button className="btn" type="button" onClick={resend}>
              Resend verification email
            </button>
          ) : null}
          <p className="muted" style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
            <Link href="/login">Back to sign in</Link>
          </p>
        </div>
      ) : null}
    </AuthCard>
  );
}