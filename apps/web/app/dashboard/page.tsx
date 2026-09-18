'use client';

import Link from 'next/link';
import { AuthenticatedLayout } from '../../components/authenticated-layout';
import { ProtectedRoute } from '../../components/protected';
import { ClientNav } from '../../components/client/client-area';
import { ClientDashboard } from '../../components/client/dashboard';
import { useAuth } from '../../lib/auth-context';

export default function DashboardPage() {
  const { user } = useAuth();
  const isClient = user?.role === 'CLIENT';

  return (
    <ProtectedRoute>
      <AuthenticatedLayout>
        {isClient ? <ClientNav /> : null}
        {isClient ? (
          <div className="mx-auto w-full max-w-5xl py-6">
            <ClientDashboard />
          </div>
        ) : (
          <div className="mx-auto w-full max-w-2xl py-10">
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Welcome, {user?.name}
              </h1>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
                Your <strong>{user?.role.toLowerCase()}</strong> workspace is being prepared.
                Check back soon.
              </p>
              <p className="mt-4 text-sm text-slate-500">
                <Link
                  href="/login"
                  className="font-semibold text-indigo-600 no-underline hover:text-indigo-700 hover:underline"
                >
                  Sign in
                </Link>{' '}
                with a client account to use the client dashboard.
              </p>
            </div>
          </div>
        )}
      </AuthenticatedLayout>
    </ProtectedRoute>
  );
}