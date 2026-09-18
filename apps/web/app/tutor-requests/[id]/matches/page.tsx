'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { RoleGate, ProtectedRoute } from '../../../../components/protected';
import { AuthenticatedLayout } from '../../../../components/authenticated-layout';
import { useApiResource, messageFromError } from '../../../../components/client/use-api-resource';
import { api } from '../../../../lib/api';
import { MatchList } from '../../../../components/matching/MatchList';
import {
  MatchLoadingState,
  MatchEmptyState,
  MatchErrorState,
  RequestNotReadyState,
} from '../../../../components/matching/MatchStates';
import type { TutorMatchData } from '../../../../components/matching/TutorMatchCard';

export default function TutorRequestMatchesPage() {
  return (
    <ProtectedRoute>
      <RoleGate allowedRoles={['CLIENT', 'COORDINATOR', 'ADMIN', 'SUPER_ADMIN']}>
        <TutorRequestMatchesContent />
      </RoleGate>
    </ProtectedRoute>
  );
}

function TutorRequestMatchesContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const requestId = params.id;

  const loader = useCallback(async () => {
    return api.listTutorRequestMatches(requestId);
  }, [requestId]);

  const { data, error, loading, reload } = useApiResource(loader);

  const handleEditRequest = useCallback(() => {
    router.push('/dashboard');
  }, [router]);

  const handleSelectTutor = useCallback(
    (tutorId: string, _matchId: string) => {
      alert(
        `Tutor selection coming soon!\n\nTutor: ${tutorId}\n\nThis will be implemented in a future feature chunk.`,
      );
    },
    [],
  );

  return (
    <AuthenticatedLayout>
      <div className="page">
        <header className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Link
                href="/dashboard"
                className="text-sm font-medium text-slate-500 hover:text-slate-700"
              >
                ← Back to Dashboard
              </Link>
              <h1 className="mt-2 text-2xl font-bold text-slate-900">Recommended Tutors</h1>
              {data?.request ? (
                <p className="mt-1 text-sm text-slate-600">
                  {data.request.subjects.join(' · ')}
                  {data.request.academicLevels.length > 0
                    ? ` · ${data.request.academicLevels.join(', ')}`
                    : ''}
                </p>
              ) : null}
            </div>
            {loading || data ? (
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={reload}
                disabled={loading}
              >
                {loading ? 'Refreshing…' : 'Refresh Matches'}
              </button>
            ) : null}
          </div>
        </header>

        {loading ? (
          <MatchLoadingState />
        ) : error ? (
          <MatchErrorState message={messageFromError(error)} onRetry={reload} />
        ) : data?.request?.ready === false ? (
          <RequestNotReadyState onEditRequest={handleEditRequest} />
        ) : data && data.count > 0 ? (
          <MatchList
            matches={data.matches as unknown as TutorMatchData[]}
            onSelectTutor={handleSelectTutor}
            selectDisabledReason="Tutor selection coming in a future update"
          />
        ) : (
          <MatchEmptyState onEditRequest={handleEditRequest} />
        )}
      </div>
    </AuthenticatedLayout>
  );
}
