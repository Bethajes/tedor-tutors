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
          <ClientDashboard />
        ) : (
          <div>
            <h1>Welcome, {user?.name}</h1>
            <p className="muted">
              Your <strong>{user?.role.toLowerCase()}</strong> workspace is being prepared. Check
              back soon.
            </p>
            <p className="muted">
              <Link href="/login">Sign in</Link> with a client account to use the client dashboard.
            </p>
          </div>
        )}
      </AuthenticatedLayout>
    </ProtectedRoute>
  );
}