'use client';

import Link from 'next/link';
import { ErrorBanner, Spinner } from '@tedor/ui';
import { api } from '../../lib/api';
import { Card } from './card';
import { EmptyState } from './empty-state';
import { useApiResource } from './use-api-resource';

export function ClientDashboard() {
  const profile = useApiResource(() => api.getClientProfile());
  const learners = useApiResource(() => api.listLearners());

  if (learners.error || profile.error) {
    return (
      <ErrorBanner
        message={learners.error ?? profile.error ?? 'Something went wrong'}
        onRetry={() => {
          learners.reload();
          profile.reload();
        }}
      />
    );
  }

  const learnerItems = learners.data?.items ?? [];
  const p = profile.data;

  return (
    <div className="dashboard-grid">
      {!p && learners.loading ? <Spinner label="Loading dashboard…" /> : null}

      <Card
        title="Profile"
        subtitle={p ? `${p.firstName} ${p.lastName}`.trim() : 'Set up your profile'}
        actions={[
          <Link key="profile" className="btn btn-sm btn-secondary" href="/profile">
            Edit
          </Link>,
        ]}
      >
        {p ? (
          <div className="profile-summary">
            {p.photoUrl ? (
              <img className="avatar" src={p.photoUrl} alt="Profile" />
            ) : (
              <div className="avatar avatar-placeholder" aria-hidden="true">
                {p.firstName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="muted" style={{ margin: 0 }}>{p.user.email}</p>
              <p className="muted" style={{ margin: '0.2rem 0 0', fontSize: '0.85rem' }}>
                {[p.phone, p.location].filter(Boolean).join(' · ') || 'No contact details'}
              </p>
            </div>
          </div>
        ) : null}
      </Card>

      <Card
        title="My learners"
        subtitle={learnerItems.length ? `${learnerItems.length} learner${learnerItems.length === 1 ? '' : 's'}` : 'Track your learners'}
        actions={[
          <Link key="add" className="btn btn-sm" href="/learners/new">
            Add learner
          </Link>,
        ]}
      >
        {learners.loading ? <Spinner label="Loading learners…" /> : null}
        {learnerItems.length === 0 ? (
          <EmptyState
            title="No learners yet"
            description="Add your first learner to get started."
            actionLabel="Add a learner"
            onAction={() => {
              window.location.href = '/learners/new';
            }}
          />
        ) : (
          <div className="chips">
            {learnerItems.map((learner) => (
              <Link key={learner.id} href={`/learners/${learner.id}`} style={{ textDecoration: 'none' }}>
                <span className="chip">
                  {learner.firstName} {learner.lastName}
                </span>
              </Link>
            ))}
          </div>
        )}
        <div className="card-actions">
          <Link className="btn btn-sm btn-secondary" href="/learners">
            View all learners
          </Link>
        </div>
      </Card>

      <EmptyState title="Tutor requests" description="Tutor requests will appear here once matching begins." />
      <EmptyState title="Upcoming sessions" description="Scheduled tutoring sessions will appear here." />
      <EmptyState title="Recommended tutors" description="Tutor recommendations will appear here soon." />
      <EmptyState title="Recent activity" description="Your recent actions will be listed here." />
    </div>
  );
}