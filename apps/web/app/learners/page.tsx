'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ErrorBanner, Spinner } from '@tedor/ui';
import type { Learner } from '@tedor/types';
import { ClientArea } from '../../components/client/client-area';
import { EmptyState } from '../../components/client/empty-state';
import { LearnerCard } from '../../components/client/learner-card';
import { useApiResource, messageFromError } from '../../components/client/use-api-resource';
import { api } from '../../lib/api';

export default function LearnersPage() {
  const { data, error, loading, reload } = useApiResource(() => api.listLearners());
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete(learner: Learner) {
    if (!window.confirm(`Delete the learner "${learner.firstName} ${learner.lastName}"?`)) return;
    setDeleteError(null);
    try {
      await api.deleteLearner(learner.id);
      await reload();
    } catch (err) {
      setDeleteError(messageFromError(err));
    }
  }

  const items = data?.items ?? [];

  return (
    <ClientArea>
      <div className="card-header">
        <div>
          <h1 style={{ margin: 0 }}>Learners</h1>
          <p className="muted" style={{ margin: '0.25rem 0 0' }}>
            The young learners you manage.
          </p>
        </div>
        <Link className="btn btn-sm" href="/learners/new">
          Add learner
        </Link>
      </div>
      {loading ? <Spinner label="Loading learners…" /> : null}
      {error ? <ErrorBanner message={error} onRetry={reload} /> : null}
      {deleteError ? <ErrorBanner message={deleteError} /> : null}
      {!loading && !error ? (
        items.length === 0 ? (
          <div className="card" style={{ marginTop: '1rem' }}>
            <EmptyState
              title="No learners yet"
              description="Add your first learner to start building their tutor profile."
              actionLabel="Add a learner"
              onAction={() => {
                window.location.href = '/learners/new';
              }}
            />
          </div>
        ) : (
          <div className="card-grid" style={{ marginTop: '1rem' }}>
            {items.map((learner) => (
              <LearnerCard
                key={learner.id}
                learner={learner}
                onManage={() => {
                  window.location.href = `/learners/${learner.id}`;
                }}
                onDelete={() => void handleDelete(learner)}
              />
            ))}
          </div>
        )
      ) : null}
    </ClientArea>
  );
}