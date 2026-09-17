'use client';

import { AuthenticatedLayout } from '../../components/authenticated-layout';
import { ProtectedRoute, RoleGate } from '../../components/protected';
import { AdminUsersPanel } from '../../components/admin-users-panel';

export default function AdminPage() {
  return (
    <ProtectedRoute>
      <RoleGate allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
        <AuthenticatedLayout>
          <h1>Admin</h1>
          <AdminUsersPanel />
        </AuthenticatedLayout>
      </RoleGate>
    </ProtectedRoute>
  );
}