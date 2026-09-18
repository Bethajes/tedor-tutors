'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Award,
  Briefcase,
  CalendarDays,
  Check,
  CircleAlert,
  Clock,
  Inbox,
  LoaderCircle,
  MapPin,
  Sparkles,
  X,
} from 'lucide-react';
import { ErrorBanner, Spinner } from '@tedor/ui';
import type { OpportunityStatus, TutorOpportunity } from '@tedor/types';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth-context';
import { ErrorAlert } from '../auth/error-alert';
import { useApiResource, messageFromError } from '../client/use-api-resource';
import { MatchReasons } from '../matching/MatchReasons';
import { MatchScore } from '../matching/MatchScore';

const STATUS_STYLES: Record<OpportunityStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-700 ring-amber-200',
  ACCEPTED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  DECLINED: 'bg-slate-100 text-slate-500 ring-slate-200',
  EXPIRED: 'bg-slate-100 text-slate-500 ring-slate-200',
  CANCELLED: 'bg-slate-100 text-slate-500 ring-slate-200',
};

function StatusPill({ status }: { status: OpportunityStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${STATUS_STYLES[status]}`}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function OpportunityCard({
  opportunity,
  acting,
  onAccept,
  onDecline,
}: {
  opportunity: TutorOpportunity;
  acting: string | null;
  onAccept: (opportunity: TutorOpportunity) => void;
  onDecline: (opportunity: TutorOpportunity) => void;
}) {
  const { request, match } = opportunity;
  const busy = acting === opportunity.id;
  const meta = [request.location ?? request.serviceArea, formatDate(opportunity.createdAt)]
    .filter(Boolean)
    .join(' · ');

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold tracking-tight text-slate-900">
              {request.subjects.length > 0 ? request.subjects.join(' · ') : 'Tutoring request'}
            </h3>
            <StatusPill status={opportunity.status} />
          </div>
          {meta ? <p className="mt-1 text-xs text-slate-500">{meta}</p> : null}
        </div>
        <MatchScore score={match.score} />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {request.subjects.map((subject) => (
          <span
            key={subject}
            className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 ring-1 ring-indigo-100 ring-inset"
          >
            {subject}
          </span>
        ))}
        {request.academicLevels.map((level) => (
          <span
            key={level}
            className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200 ring-inset"
          >
            {level}
          </span>
        ))}
      </div>

      <MatchReasons reasons={match.matchReasons} />

      {(request.teachingModes.length > 0 || request.schedule.length > 0 || request.notes) && (
        <dl className="mt-4 grid gap-2.5 rounded-xl bg-slate-50/70 p-3.5 text-sm sm:grid-cols-2">
          {request.teachingModes.length > 0 && (
            <div className="flex items-start gap-2">
              <Briefcase className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden="true" />
              <div>
                <dt className="text-xs font-medium text-slate-400">Mode</dt>
                <dd className="font-medium text-slate-700">{request.teachingModes.join(', ')}</dd>
              </div>
            </div>
          )}
          {request.schedule.length > 0 && (
            <div className="flex items-start gap-2">
              <CalendarDays className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden="true" />
              <div>
                <dt className="text-xs font-medium text-slate-400">Schedule</dt>
                <dd className="font-medium text-slate-700">
                  {request.schedule
                    .slice(0, 3)
                    .map((slot) => `${slot.dayOfWeek} ${slot.startTime}–${slot.endTime}`)
                    .join(' · ')}
                  {request.schedule.length > 3 ? ` +${request.schedule.length - 3} more` : ''}
                </dd>
              </div>
            </div>
          )}
          {request.location && (
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden="true" />
              <div>
                <dt className="text-xs font-medium text-slate-400">Location</dt>
                <dd className="font-medium text-slate-700">{request.location}</dd>
              </div>
            </div>
          )}
          {request.notes && (
            <div className="flex items-start gap-2 sm:col-span-2">
              <Clock className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden="true" />
              <div className="min-w-0">
                <dt className="text-xs font-medium text-slate-400">Notes</dt>
                <dd className="line-clamp-2 text-slate-700">{request.notes}</dd>
              </div>
            </div>
          )}
        </dl>
      )}

      {opportunity.status === 'PENDING' && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => onAccept(opportunity)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-600/30 transition-colors hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Check className="size-4" aria-hidden="true" />
            )}
            Accept
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onDecline(opportunity)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none disabled:opacity-60"
          >
            <X className="size-4" aria-hidden="true" />
            Decline
          </button>
        </div>
      )}
    </article>
  );
}

export function TutorDashboard() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useApiResource(() => api.listTutorOpportunities());
  const [actingId, setActingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [declining, setDeclining] = useState<TutorOpportunity | null>(null);

  async function respond(opportunity: TutorOpportunity, action: 'accept' | 'decline') {
    setActingId(opportunity.id);
    setActionError(null);
    try {
      if (action === 'accept') {
        await api.acceptTutorOpportunity(opportunity.id);
      } else {
        await api.declineTutorOpportunity(opportunity.id);
      }
      setDeclining(null);
      reload();
    } catch (err) {
      setActionError(messageFromError(err));
    } finally {
      setActingId(null);
    }
  }

  const opportunities = data?.opportunities ?? [];
  const pending = opportunities.filter((opp) => opp.status === 'PENDING');
  const responded = opportunities.filter((opp) => opp.status !== 'PENDING');
  const accepted = opportunities.filter((opp) => opp.status === 'ACCEPTED').length;
  const avgScore =
    pending.length > 0
      ? Math.round(pending.reduce((sum, opp) => sum + opp.match.score, 0) / pending.length)
      : 0;

  return (
    <div className="mx-auto w-full max-w-5xl py-6">
      <div className="mb-6">
        <p className="text-xs font-semibold tracking-widest text-indigo-600 uppercase">
          Tutor workspace
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
          Welcome back, {user?.name?.split(' ')[0] ?? 'tutor'}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          Review new tutoring opportunities matched to your profile and respond to requests.
        </p>
      </div>

      {loading && !data ? <Spinner label="Loading your workspace…" /> : null}
      {error ? <ErrorBanner message={error} onRetry={reload} /> : null}
      {actionError ? (
        <div className="mb-4">
          <ErrorAlert message={actionError} onDismiss={() => setActionError(null)} />
        </div>
      ) : null}

      {data ? (
        <>
          {user && !user.emailVerified ? (
            <div
              role="alert"
              className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm"
            >
              <CircleAlert
                className="mt-0.5 size-4.5 shrink-0 text-amber-500"
                aria-hidden="true"
              />
              <p className="leading-relaxed text-amber-900">
                Verify your email to start receiving tutoring requests.{' '}
                <Link
                  href="/verify-email"
                  className="font-semibold text-amber-900 underline underline-offset-2 hover:text-amber-700"
                >
                  Verify it now
                </Link>
              </p>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-100 ring-inset">
                  <Inbox className="size-5" aria-hidden="true" />
                </span>
                <p className="text-sm font-medium text-slate-500">Awaiting response</p>
              </div>
              <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
                {pending.length}
              </p>
              <p className="mt-1 text-xs text-slate-400">opportunities to review</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 ring-inset">
                  <Award className="size-5" aria-hidden="true" />
                </span>
                <p className="text-sm font-medium text-slate-500">Accepted</p>
              </div>
              <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{accepted}</p>
              <p className="mt-1 text-xs text-slate-400">requests you took on</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100 ring-inset">
                  <Sparkles className="size-5" aria-hidden="true" />
                </span>
                <p className="text-sm font-medium text-slate-500">Avg. match</p>
              </div>
              <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
                {pending.length > 0 ? `${avgScore}%` : '—'}
              </p>
              <p className="mt-1 text-xs text-slate-400">across pending requests</p>
            </div>
          </div>

          <h2 className="mt-8 mb-3 text-base font-semibold tracking-tight text-slate-900">
            Needs your response
            {pending.length > 0 ? (
              <span className="ml-2 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                {pending.length}
              </span>
            ) : null}
          </h2>
          {pending.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/5">
              <div className="flex flex-col items-center px-6 py-10 text-center">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500 ring-1 ring-indigo-100 ring-inset">
                  <Inbox className="size-6" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-sm font-semibold text-slate-900">All caught up</h3>
                <p className="mt-1 max-w-sm text-sm leading-relaxed text-slate-500">
                  No pending requests right now. New opportunities matched to your subjects and
                  availability will appear here.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid items-start gap-4 lg:grid-cols-2">
              {pending.map((opportunity) => (
                <OpportunityCard
                  key={opportunity.id}
                  opportunity={opportunity}
                  acting={actingId}
                  onAccept={(opp) => void respond(opp, 'accept')}
                  onDecline={setDeclining}
                />
              ))}
            </div>
          )}

          {responded.length > 0 ? (
            <>
              <h2 className="mt-8 mb-3 text-base font-semibold tracking-tight text-slate-900">
                Recently responded
              </h2>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/5">
                <ul className="divide-y divide-slate-100">
                  {responded.slice(0, 8).map((opportunity) => (
                    <li
                      key={opportunity.id}
                      className="flex items-center gap-3 px-4 py-3 sm:px-5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {opportunity.request.subjects.length > 0
                            ? opportunity.request.subjects.join(' · ')
                            : 'Tutoring request'}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Match {opportunity.match.score}% · {formatDate(opportunity.createdAt)}
                        </p>
                      </div>
                      <StatusPill status={opportunity.status} />
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : null}
        </>
      ) : null}

      {declining ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="decline-title"
          onClick={() => setDeclining(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="decline-title" className="text-base font-semibold text-slate-900">
              Decline this request?
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">
              {declining.request.subjects.length > 0
                ? declining.request.subjects.join(' · ')
                : 'This request'}{' '}
              will be offered to another tutor. You can&apos;t undo this.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeclining(null)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Keep it
              </button>
              <button
                type="button"
                disabled={actingId === declining.id}
                onClick={() => void respond(declining, 'decline')}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:opacity-60"
              >
                {actingId === declining.id ? (
                  <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                ) : null}
                Decline
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
