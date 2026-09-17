'use client';

import { AuthenticatedLayout } from '../../components/authenticated-layout';
import { ProtectedRoute } from '../../components/protected';
import { useAuth } from '../../lib/auth-context';

export default function DashboardPage() {
  const { user } = useAuth();
  return (
    <ProtectedRoute>
      <AuthenticatedLayout>
        <h1>Dashboard</h1>
        <p className="muted">
          Welcome, {user?.name}. Your role is <strong>{user?.role}</strong>.
        </p>
        <ul className="muted">
          <li>Email verified: {user?.emailVerified ? 'Yes' : 'No'}</li>
          <li>Telegram linked: {user?.telegramLinked ? 'Yes' : 'No'}</li>
          <li>Account status: {user?.status}</li>
        </ul>
      </AuthenticatedLayout>
    </ProtectedRoute>
  );
}