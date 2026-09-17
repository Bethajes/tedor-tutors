'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useAuth } from '../lib/auth-context';

export function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const { user, logout, initializing } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  return (
    <div>
      <nav className="nav">
        <Link href={user ? '/' : '/login'}>
          <strong>Tedor Path</strong>
        </Link>
        <span className="spacer" />
        {user ? (
          <>
            <span className="muted">
              {user.name} · <strong>{user.role}</strong>
            </span>
            <button type="button" onClick={handleLogout} style={{ margin: 0, paddingLeft: '5px', paddingRight: '5px' }}>
              Sign out
            </button>
          </>
        ) : null}
      </nav>
      {initializing ? null : <main className="page">{children}</main>}
    </div>
  );
}