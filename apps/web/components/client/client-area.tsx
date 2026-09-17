'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { AuthenticatedLayout } from '../authenticated-layout';
import { ProtectedRoute, RoleGate } from '../protected';

const CLIENT_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/profile', label: 'Profile' },
  { href: '/learners', label: 'Learners' },
  { href: '/settings', label: 'Settings' },
] as const;

export function ClientNav() {
  const pathname = usePathname();
  return (
    <nav className="client-nav" aria-label="Client">
      {CLIENT_LINKS.map((link) => {
        const active = link.href === '/dashboard'
          ? pathname === '/dashboard'
          : pathname.startsWith(link.href);
        return (
          <Link key={link.href} href={link.href} aria-current={active ? 'page' : undefined}>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function ClientArea({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <RoleGate allowedRoles={['CLIENT']}>
        <AuthenticatedLayout>
          <ClientNav />
          <div className="client-content">{children}</div>
        </AuthenticatedLayout>
      </RoleGate>
    </ProtectedRoute>
  );
}