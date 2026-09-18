'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { use, useState } from 'react';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { ErrorBanner, Spinner } from '@tedor/ui';
import { ErrorAlert } from '../../../components/auth/error-alert';
import { ClientArea } from '../../../components/client/client-area';
import { ConfirmDialog, LearnerAvatar } from '../../../components/client/client-ui';
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
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteLearner(id);
      router.replace('/learners');
    } catch (err) {
      setDeleteError(messageFromError(err));
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }

  const fullName = data ? `${data.firstName} ${data.lastName}`.trim() : 'Learner';
  const meta = data
    ? [data.age != null ? `Age ${data.age}` : null, data.grade, data.school]
        .filter(Boolean)
        .join(' · ')
    : '';

  return (
    <ClientArea>
      <Link
        href="/learners"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 no-underline transition-colors hover:text-indigo-600"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to learners
      </Link>

      {loading && !data ? <Spinner label="Loading learner…" /> : null}
      {error ? <ErrorBanner message={error} onRetry={reload} /> : null}
      {deleteError ? (
        <div className="mb-4">
          <ErrorAlert message={deleteError} onDismiss={() => setDeleteError(null)} />
        </div>
      ) : null}

      {data ? (
        <>
          <div className="mb-6 flex flex-wrap items-center gap-4">
            <LearnerAvatar firstName={data.firstName} lastName={data.lastName} size="lg" />
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-widest text-indigo-600 uppercase">
                Learner
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{fullName}</h1>
              {meta ? <p className="mt-1 text-sm text-slate-500">{meta}</p> : null}
            </div>
          </div>

          <LearnerForm
            learner={data}
            submitLabel="Save changes"
            onSaved={() => reload()}
            onCancel={() => router.replace('/learners')}
          />

          <div className="mt-4 rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Danger zone</h2>
            <p className="mt-1 text-sm text-slate-500">
              Removing this learner is permanent and cannot be undone.
            </p>
            <button
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none"
              type="button"
              onClick={() => setConfirmingDelete(true)}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Delete learner
            </button>
          </div>
        </>
      ) : null}

      {confirmingDelete ? (
        <ConfirmDialog
          title={`Delete ${fullName}?`}
          description="This removes the learner from your account. This cannot be undone."
          confirmLabel="Delete learner"
          pending={deleting}
          onConfirm={() => void handleDelete()}
          onCancel={() => {
            if (!deleting) setConfirmingDelete(false);
          }}
        />
      ) : null}
    </ClientArea>
  );
}
