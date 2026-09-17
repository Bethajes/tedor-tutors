'use client';

import { useState } from 'react';
import { ErrorBanner, Spinner } from '@tedor/ui';
import { ClientArea } from '../../components/client/client-area';
import { ProfileCard } from '../../components/client/profile-card';
import { ProfileForm } from '../../components/client/profile-form';
import { useApiResource } from '../../components/client/use-api-resource';
import { api } from '../../lib/api';

export default function ProfilePage() {
  const { data, error, loading, reload } = useApiResource(() => api.getClientProfile());
  const [editing, setEditing] = useState(false);

  return (
    <ClientArea>
      <h1>Profile</h1>
      {loading ? <Spinner label="Loading profile…" /> : null}
      {error ? <ErrorBanner message={error} onRetry={reload} /> : null}
      {data ? (
        editing ? (
          <ProfileForm
            profile={data}
            onSaved={() => {
              setEditing(false);
              reload();
            }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <ProfileCard profile={data} onEdit={() => setEditing(true)} />
        )
      ) : null}
    </ClientArea>
  );
}