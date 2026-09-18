'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ArrowUpDown, GraduationCap, Plus, Search } from 'lucide-react';
import { ErrorBanner, Spinner } from '@tedor/ui';
import type { Learner } from '@tedor/types';
import { api } from '../../lib/api';
import { ErrorAlert } from '../../components/auth/error-alert';
import { ClientArea } from '../../components/client/client-area';
import { ConfirmDialog, PageHeader } from '../../components/client/client-ui';
import { EmptyState } from '../../components/client/empty-state';
import { LearnerCard } from '../../components/client/learner-card';
import { useApiResource, messageFromError } from '../../components/client/use-api-resource';

type SortKey = 'recent' | 'name' | 'age';

function sortLearners(items: Learner[], sort: SortKey): Learner[] {
  const copy = [...items];
  switch (sort) {
    case 'name':
      return copy.sort((a, b) =>
        `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`),
      );
    case 'age':
      return copy.sort((a, b) => (a.age ?? Number.MAX_SAFE_INTEGER) - (b.age ?? Number.MAX_SAFE_INTEGER));
    case 'recent':
    default:
      return copy.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }
}

export default function LearnersPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('recent');
  const [pendingDelete, setPendingDelete] = useState<Learner | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data, error, loading, reload } = useApiResource(() =>
    api.listLearners(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
  );

  // Debounce the search box so we don't fire a request on every keystroke.
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  async function handleDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteLearner(pendingDelete.id);
      setPendingDelete(null);
      reload();
    } catch (err) {
      setDeleteError(messageFromError(err));
      setDeleting(false);
    }
  }

  const items = useMemo(() => sortLearners(data?.items ?? [], sort), [data, sort]);
  const total = data?.total ?? 0;

  return (
    <ClientArea>
      <PageHeader
        eyebrow="Learners"
        title="Learners"
        description={
          total === 0
            ? 'The young learners you manage.'
            : `${total} ${total === 1 ? 'learner' : 'learners'} on your account`
        }
        actions={[
          <Link
            key="add"
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white no-underline shadow-sm shadow-indigo-600/30 transition-colors hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none"
            href="/learners/new"
          >
            <Plus className="size-4" aria-hidden="true" />
            Add learner
          </Link>,
        ]}
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Search learners</span>
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, school, or subject…"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-3.5 pl-10 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </label>
        <label className="relative sm:w-52">
          <span className="sr-only">Sort learners</span>
          <ArrowUpDown
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as SortKey)}
            className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pr-3.5 pl-10 text-sm font-medium text-slate-700 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="recent">Recently added</option>
            <option value="name">Name (A–Z)</option>
            <option value="age">Youngest first</option>
          </select>
        </label>
      </div>

      {loading && !data ? <Spinner label="Loading learners…" /> : null}
      {error ? <ErrorBanner message={error} onRetry={reload} /> : null}
      {deleteError ? (
        <div className="mb-4">
          <ErrorAlert message={deleteError} onDismiss={() => setDeleteError(null)} />
        </div>
      ) : null}

      {!loading || data ? (
        !error && items.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/5">
            <EmptyState
              title={debouncedSearch.trim() ? 'No learners match your search' : 'No learners yet'}
              description={
                debouncedSearch.trim()
                  ? `Nothing matches “${debouncedSearch.trim()}”. Try a different name, school, or subject.`
                  : 'Add your first learner to start building their tutor profile.'
              }
              actionLabel={debouncedSearch.trim() ? undefined : 'Add a learner'}
              onAction={
                debouncedSearch.trim()
                  ? undefined
                  : () => router.push('/learners/new')
              }
              icon={<GraduationCap className="size-6" aria-hidden="true" />}
            />
          </div>
        ) : (
          <div className="grid items-start gap-4 md:grid-cols-2">
            {items.map((learner) => (
              <LearnerCard
                key={learner.id}
                learner={learner}
                onManage={() => router.push(`/learners/${learner.id}`)}
                onDelete={() => setPendingDelete(learner)}
              />
            ))}
          </div>
        )
      ) : null}

      {pendingDelete ? (
        <ConfirmDialog
          title={`Delete ${pendingDelete.firstName} ${pendingDelete.lastName}?`}
          description="This removes the learner from your account. This cannot be undone."
          confirmLabel="Delete learner"
          pending={deleting}
          onConfirm={() => void handleDelete()}
          onCancel={() => {
            if (!deleting) setPendingDelete(null);
          }}
        />
      ) : null}
    </ClientArea>
  );
}
