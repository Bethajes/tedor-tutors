'use client';

import { useState } from 'react';
import { ErrorBanner } from '@tedor/ui';
import { changePasswordSchema } from '@tedor/validation';
import { ClientArea } from '../../components/client/client-area';
import { Card } from '../../components/client/card';
import { messageFromError } from '../../components/client/use-api-resource';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth-context';

export default function SettingsPage() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (newPassword !== confirmPassword) {
      setError('The new passwords do not match.');
      return;
    }
    const parsed = changePasswordSchema.safeParse({ currentPassword, newPassword });
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? 'Check your input');
      return;
    }
    setSaving(true);
    try {
      await api.changePassword(parsed.data);
      setNotice('Password updated.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ClientArea>
      <h1>Settings</h1>

      <Card title="Account">
        <dl className="detail-list">
          <div>
            <dt>Name</dt>
            <dd>{user?.name ?? '—'}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{user?.email ?? '—'}</dd>
          </div>
          <div>
            <dt>Role</dt>
            <dd>{user?.role ?? '—'}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{user?.status ?? '—'}</dd>
          </div>
          <div>
            <dt>Email verified</dt>
            <dd>{user ? (user.emailVerified ? 'Yes' : 'No') : '—'}</dd>
          </div>
          <div>
            <dt>Telegram linked</dt>
            <dd>{user ? (user.telegramLinked ? 'Yes' : 'No') : '—'}</dd>
          </div>
        </dl>
      </Card>

      <Card title="Change password">
        {error ? <ErrorBanner message={error} /> : null}
        {notice ? (
          <p role="status" style={{ color: '#15803d', fontSize: '0.9rem', margin: '0 0 1rem' }}>
            {notice}
          </p>
        ) : null}
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-fields">
            <div>
              <label htmlFor="currentPassword">Current password</label>
              <input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="newPassword">New password</label>
              <input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="confirmPassword">Confirm new password</label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
            </div>
          </div>
          <button className="btn" type="submit" disabled={saving}>
            {saving ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </Card>
    </ClientArea>
  );
}