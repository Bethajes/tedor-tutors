'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { GraduationCap, LayoutDashboard, Settings, UserRound } from 'lucide-react';
import { AuthenticatedLayout } from '../authenticated-layout';
import { ProtectedRoute, RoleGate } from '../protected';

const CLIENT_LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/profile', label: 'Profile', icon: UserRound },
  { href: '/learners', label: 'Learners', icon: GraduationCap },
  { href: '/settings', label: 'Settings', icon: Settings },
] as const;

export function ClientNav() {
  const pathname = usePathname();
  return (
    <div className="sticky top-0 z-10 -mx-4 border-b border-slate-200 bg-slate-50/95 px-4 backdrop-blur sm:-mx-6 sm:px-6">
      <nav className="flex gap-1 overflow-x-auto py-2" aria-label="Client">
        {CLIENT_LINKS.map((link) => {
          const active =
            link.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(link.href);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? 'page' : undefined}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium no-underline transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none ${
                active
                  ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200 ring-inset'
                  : 'text-slate-500 hover:bg-white hover:text-slate-900'
              }`}
            >
              <Icon className="size-4" aria-hidden="true" />
              {link.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function ClientArea({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <RoleGate allowedRoles={['CLIENT']}>
        <AuthenticatedLayout>
          <ClientNav />
          <div className="mx-auto w-full max-w-5xl py-6">{children}</div>
        </AuthenticatedLayout>
      </RoleGate>
    </ProtectedRoute>
  );
}
