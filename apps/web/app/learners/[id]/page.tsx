'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { use } from 'react';
import { ErrorBanner, Spinner } from '@tedor/ui';
import { ClientArea } from '../../../components/client/client-area';
import { LearnerForm } from '../../../components/client/learner-form';
import { useApiResource, messageFromError } from '../../../components/client/use-api-resource';
import { api } from '../../../lib/api';

export default function LearnerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data, error, loading, reload } = useApiResource(() => api.getLearner(id));
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete() {
    if (!window.confirm('Delete this learner? This cannot be undone.')) return;
    setDeleteError(null);
    try {
      await api.deleteLearner(id);
      router.replace('/learners');
    } catch (err) {
      setDeleteError(messageFromError(err));
    }
  }

  return (
    <ClientArea>
      {loading ? <Spinner label="Loading learner…" /> : null}
      {error ? <ErrorBanner message={error} onRetry={reload} /> : null}
      {deleteError ? <ErrorBanner message={deleteError} /> : null}
      {data ? (
        <>
          <h1>
            {data.firstName} {data.lastName}
          </h1>
          <LearnerForm
            learner={data}
            submitLabel="Save changes"
            onSaved={() => reload()}
            onCancel={() => router.replace('/learners')}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button className="btn btn-sm btn-danger" type="button" onClick={() => void handleDelete()}>
              Delete learner
            </button>
          </div>
        </>
      ) : null}
    </ClientArea>
  );
}