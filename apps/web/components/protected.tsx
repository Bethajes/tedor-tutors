'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { Spinner } from '@tedor/ui';
import { useAuth, ROLE_HOME } from './auth-context';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, initializing } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!initializing && !user) {
      router.replace(`/login?next=${encodeURIComponent(window.location.pathname)}`);
    }
  }, [initializing, user, router]);

  if (initializing) {
    return <Spinner label="Checking your session…" />;
  }
  if (!user) return null;
  return <>{children}</>;
}

export function RoleGate({ allowedRoles, children }: { allowedRoles: string[]; children: ReactNode }) {
  const { user, initializing } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (initializing || !user) return;
    if (!allowedRoles.includes(user.role)) {
      router.replace(ROLE_HOME[user.role]);
    }
  }, [initializing, user, allowedRoles, router]);

  if (initializing) return <Spinner label="Checking permissions…" />;
  if (!user || !allowedRoles.includes(user.role)) return null;
  return <>{children}</>;
}