'use client';

import { useCallback, useEffect, useState } from 'react';
import { ErrorBanner, Spinner } from '@tedor/ui';
import { api } from '../../lib/api';

interface UserSummary {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  emailVerified: boolean;
  createdAt: string;
}

export function AdminUsersPanel() {
  const [users, setUsers] = useState<UserSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await api.request<
        { items: UserSummary[] }
      >('/users?page=1&pageSize=50', { auth: true });
      setUsers(data.data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load users');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggle(user: UserSummary) {
    setBusyId(user.id);
    setError(null);
    try {
      const nextStatus = user.status === 'DISABLED' ? 'ACTIVE' : 'DISABLED';
      await api.request(`/users/${user.id}/status`, {
        method: 'PATCH',
        auth: true,
        body: { status: nextStatus },
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update user');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <h2>Accounts</h2>
      {error ? <ErrorBanner message={error} onRetry={load} /> : null}
      {users === null ? (
        <Spinner label="Loading accounts…" />
      ) : users.length === 0 ? (
        <p className="muted">No users yet.</p>
      ) : (
        <table style={{ borderCollapse: 'collapse', width: '100%', marginTop: '1rem' }}>
          <thead>
            <tr style={{ textAlign: 'left' }}>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th />

            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>{user.emailVerified ? `${user.status} · verified` : `${user.status} · unverified`}</td>
                <td>
                  <button
                    type="button"
                    disabled={busyId === user.id}
                    onClick={() => void toggle(user)}
                  >
                    {user.status === 'DISABLED' ? 'Enable' : 'Disable'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}