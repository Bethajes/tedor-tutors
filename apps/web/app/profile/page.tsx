'use client';

import { useState } from 'react';
import { ErrorBanner, Spinner } from '@tedor/ui';
import { ClientArea } from '../../components/client/client-area';
import { PageHeader } from '../../components/client/client-ui';
import { ProfileCard } from '../../components/client/profile-card';
import { ProfileForm } from '../../components/client/profile-form';
import { useApiResource } from '../../components/client/use-api-resource';
import { api } from '../../lib/api';

export default function ProfilePage() {
  const { data, error, loading, reload } = useApiResource(() => api.getClientProfile());
  const [editing, setEditing] = useState(false);

  return (
    <ClientArea>
      <PageHeader
        eyebrow="Account"
        title="Profile"
        description="Your contact details and preferences — shared with tutors you work with."
      />
      {loading && !data ? <Spinner label="Loading profile…" /> : null}
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
