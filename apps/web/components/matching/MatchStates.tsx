'use client';

import Link from 'next/link';
import { Spinner, ErrorBanner } from '@tedor/ui';

export function MatchLoadingState() {
  return (
    <div className="space-y-6 py-12">
      <div className="text-center">
        <Spinner label="Finding suitable tutors..." />
        <p className="mt-4 text-sm text-slate-500 max-w-md mx-auto">
          We're searching our tutor network and ranking matches based on your
          requirements. This usually takes a few seconds.
        </p>
      </div>
      <div className="card-grid max-w-4xl mx-auto">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card animate-pulse" aria-hidden="true">
            <div className="flex gap-4">
              <div className="h-16 w-16 rounded-full bg-slate-200" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-2/3 rounded bg-slate-200" />
                <div className="h-4 w-1/2 rounded bg-slate-200" />
                <div className="h-4 w-3/4 rounded bg-slate-100" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MatchEmptyState({ onEditRequest }: { onEditRequest?: () => void }) {
  return (
    <div className="card text-center max-w-xl mx-auto my-8">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 ring-1 ring-amber-200">
        <svg
          className="h-8 w-8 text-amber-600"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
          <path d="M8 11h6" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-slate-900">
        We couldn't find a tutor matching all your requirements.
      </h3>
      <p className="mt-2 text-sm text-slate-600">
        Try adjusting one or more of the following to broaden your search:
      </p>
      <ul className="mt-4 space-y-1.5 text-sm text-slate-700 list-disc list-inside max-w-sm mx-auto text-left">
        <li>Availability — be more flexible with days/times</li>
        <li>Budget — consider a slightly higher hourly rate</li>
        <li>Location — expand your service area or try online</li>
        <li>Teaching mode — allow both in-person and online</li>
      </ul>
      <div className="mt-6">
        {onEditRequest ? (
          <button type="button" onClick={onEditRequest} className="btn btn-secondary btn-sm">
            Edit Tutor Request
          </button>
        ) : (
          <Link href="/dashboard" className="btn btn-secondary btn-sm inline-block">
            Back to Dashboard
          </Link>
        )}
      </div>
    </div>
  );
}

export function RequestNotReadyState({ onEditRequest }: { onEditRequest?: () => void }) {
  return (
    <div className="card text-center max-w-xl mx-auto my-8">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sky-50 ring-1 ring-sky-200">
        <svg
          className="h-8 w-8 text-sky-600"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-slate-900">
        Complete your tutor request before viewing matches.
      </h3>
      <p className="mt-2 text-sm text-slate-600">
        We need a few more details before we can find the perfect tutor for you.
        Please finish filling out your request form.
      </p>
      <div className="mt-6">
        {onEditRequest ? (
          <button type="button" onClick={onEditRequest} className="btn btn-sm">
            Complete Tutor Request
          </button>
        ) : (
          <Link href="/dashboard" className="btn btn-sm inline-block">
            Go to Dashboard
          </Link>
        )}
      </div>
    </div>
  );
}

export function MatchErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="max-w-xl mx-auto my-8">
      <ErrorBanner message={message} onRetry={onRetry} />
    </div>
  );
}
