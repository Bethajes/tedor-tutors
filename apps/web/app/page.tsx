'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect } from 'react';
import { useAuth, ROLE_HOME } from '../lib/auth-context';

export default function HomePage() {
  const { user, initializing } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!initializing) {
      router.replace(user ? ROLE_HOME[user.role] : '/login');
    }
  }, [initializing, user, router]);

  return (
    <div className="page">
      <h1>Tedor Path</h1>
      <p className="muted">Redirecting…</p>
      <Link href="/login">Go to login</Link>
    </div>
  );
}