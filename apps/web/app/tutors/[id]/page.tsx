'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { RoleGate, ProtectedRoute } from '../../../components/protected';
import { AuthenticatedLayout } from '../../../components/authenticated-layout';
import { useApiResource, messageFromError } from '../../../components/client/use-api-resource';
import { api } from '../../../lib/api';
import { Spinner, ErrorBanner } from '@tedor/ui';

type DayOfWeekKey = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

const DAY_NAMES: Record<DayOfWeekKey, string> = {
  MONDAY: 'Monday',
  TUESDAY: 'Tuesday',
  WEDNESDAY: 'Wednesday',
  THURSDAY: 'Thursday',
  FRIDAY: 'Friday',
  SATURDAY: 'Saturday',
  SUNDAY: 'Sunday',
};

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase() || '?';
}

function formatTeachingMode(mode: string): string {
  switch (mode) {
    case 'IN_PERSON':
      return 'In-person';
    case 'ONLINE':
      return 'Online';
    case 'BOTH':
      return 'In-person & Online';
    default:
      return mode;
  }
}

export default function TutorProfilePage() {
  return (
    <ProtectedRoute>
      <RoleGate allowedRoles={['CLIENT', 'COORDINATOR', 'ADMIN', 'SUPER_ADMIN']}>
        <TutorProfileContent />
      </RoleGate>
    </ProtectedRoute>
  );
}

function TutorProfileContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const tutorId = params.id;

  const loader = useCallback(async () => {
    return api.getTutorProfile(tutorId);
  }, [tutorId]);

  const { data: tutor, error, loading, reload } = useApiResource(loader);

  const handleSelect = useCallback(() => {
    alert(
      `Tutor selection coming soon!\n\nThis will be implemented in a future feature chunk.`,
    );
  }, []);

  return (
    <AuthenticatedLayout>
      <div className="page">
        <header className="mb-6">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            ← Back to Dashboard
          </Link>
        </header>

        {loading ? (
          <div className="py-12">
            <Spinner label="Loading tutor profile..." />
          </div>
        ) : error ? (
          <ErrorBanner message={messageFromError(error)} onRetry={reload} />
        ) : tutor ? (
          <>
            <section className="card mb-6 animate-fade-in">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                <div className="flex-shrink-0">
                  {tutor.photo ? (
                    <img
                      src={tutor.photo}
                      alt={`${tutor.name} profile photo`}
                      className="avatar"
                      style={{ width: '6rem', height: '6rem' }}
                    />
                  ) : (
                    <div
                      className="flex items-center justify-center rounded-full bg-sky-100 text-sky-700 font-bold"
                      style={{ width: '6rem', height: '6rem', fontSize: '1.8rem' }}
                      aria-hidden="true"
                    >
                      {initialsOf(tutor.name)}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h1 className="text-2xl font-bold text-slate-900">{tutor.name}</h1>
                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
                        {typeof tutor.experience === 'number' ? (
                          <span>
                            {tutor.experience === 0
                              ? 'New tutor'
                              : `${tutor.experience} ${tutor.experience === 1 ? 'year' : 'years'} experience`}
                          </span>
                        ) : null}
                        {tutor.rating ? (
                          <span className="inline-flex items-center gap-1">
                            <svg
                              className="h-4 w-4 text-amber-500"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              aria-hidden="true"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.175 0l-3.37 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.05 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
                            </svg>
                            {tutor.rating.toFixed(1)} rating
                          </span>
                        ) : null}
                        {typeof tutor.hourlyRate === 'number' ? (
                          <span className="font-semibold text-violet-700">
                            ${tutor.hourlyRate}/hr
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        onClick={() => router.back()}
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={handleSelect}
                        title="Tutor selection coming soon"
                      >
                        Select Tutor
                      </button>
                    </div>
                  </div>

                  {tutor.bio ? (
                    <p className="mt-4 text-slate-700 leading-relaxed whitespace-pre-line">
                      {tutor.bio}
                    </p>
                  ) : null}
                </div>
              </div>
            </section>

            <div className="grid gap-6 md:grid-cols-2">
              <section className="section-card">
                <h2>Subjects & Levels</h2>
                <p className="section-subtitle">Subjects this tutor teaches</p>
                <div className="chips">
                  {tutor.subjects.length > 0 ? (
                    tutor.subjects.map((s) => (
                      <span key={s} className="chip">
                        {s}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-slate-500">No subjects listed</span>
                  )}
                </div>
                {tutor.levels.length > 0 ? (
                  <>
                    <h3 className="mt-5 text-sm font-semibold text-slate-700">Academic Levels</h3>
                    <div className="chips">
                      {tutor.levels.map((level) => (
                        <span
                          key={level}
                          className="chip"
                          style={{ background: '#ecfeff', color: '#0e7490' }}
                        >
                          {level}
                        </span>
                      ))}
                    </div>
                  </>
                ) : null}
              </section>

              <section className="section-card">
                <h2>Teaching Details</h2>
                <p className="section-subtitle">How and where this tutor teaches</p>
                <dl className="detail-list">
                  <dt>Teaching modes</dt>
                  <dd>
                    {tutor.teachingModes.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {tutor.teachingModes.map((m) => (
                          <span
                            key={m}
                            className="chip"
                            style={{ background: '#f0fdf4', color: '#15803d' }}
                          >
                            {formatTeachingMode(m)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-500 text-sm">Not specified</span>
                    )}
                  </dd>
                  <dt>Location</dt>
                  <dd>{tutor.location || <span className="text-slate-500 text-sm">Not specified</span>}</dd>
                  <dt>Service areas</dt>
                  <dd>
                    {tutor.serviceAreas.length > 0 ? (
                      tutor.serviceAreas.join(', ')
                    ) : (
                      <span className="text-slate-500 text-sm">Not specified</span>
                    )}
                  </dd>
                  <dt>Languages</dt>
                  <dd>
                    {tutor.languages.length > 0 ? (
                      tutor.languages.join(', ')
                    ) : (
                      <span className="text-slate-500 text-sm">Not specified</span>
                    )}
                  </dd>
                </dl>
              </section>

              <section className="section-card md:col-span-2">
                <h2>Availability</h2>
                <p className="section-subtitle">Regular weekly schedule</p>
                {tutor.availability.length > 0 ? (
                  <ul className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {tutor.availability.map((slot, idx) => {
                      const day = DAY_NAMES[slot.dayOfWeek as DayOfWeekKey] ?? slot.dayOfWeek;
                      return (
                        <li
                          key={idx}
                          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                        >
                          <div className="font-semibold text-slate-800">{day}</div>
                          <div className="text-slate-600 tabular-nums">
                            {slot.startTime} – {slot.endTime}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">Availability not listed yet.</p>
                )}
              </section>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => router.back()}
              >
                Back to Results
              </button>
              <button
                type="button"
                className="btn btn-sm"
                onClick={handleSelect}
                title="Tutor selection coming soon"
              >
                Select This Tutor
              </button>
            </div>
          </>
        ) : null}
      </div>
    </AuthenticatedLayout>
  );
}
