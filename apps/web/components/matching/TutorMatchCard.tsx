'use client';

import Link from 'next/link';
import { MatchScore } from './MatchScore';
import { MatchReasons } from './MatchReasons';

export interface TutorMatchData {
  id: string;
  tutor: {
    id: string;
    name: string;
    photo: string | null;
    subjects: string[];
    levels: string[];
    experience: number | null;
    rating: number | null;
    teachingModes: string[];
    serviceAreas: string[];
    location: string | null;
    hourlyRate: number | null;
  };
  score: number;
  matchReasons: string[];
  status: string;
}

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

export function TutorMatchCard({
  match,
  onSelect,
  selectDisabledReason,
}: {
  match: TutorMatchData;
  onSelect?: () => void;
  selectDisabledReason?: string;
}) {
  const { tutor, score, matchReasons } = match;
  const canSelect = Boolean(onSelect) && !selectDisabledReason;

  return (
    <article className="card flex flex-col gap-4 animate-rise-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex-shrink-0">
          {tutor.photo ? (
            <img
              src={tutor.photo}
              alt={`${tutor.name} profile photo`}
              className="avatar"
              loading="lazy"
            />
          ) : (
            <div
              className="profile-summary"
              aria-hidden="true"
            >
              <div className="avatar-placeholder">{initialsOf(tutor.name)}</div>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-slate-900 truncate">{tutor.name}</h3>
              <p className="mt-0.5 text-sm text-slate-600">
                {tutor.subjects.length > 0 ? tutor.subjects.join(' · ') : 'No subjects listed'}
              </p>
              {typeof tutor.experience === 'number' ? (
                <p className="mt-0.5 text-sm text-slate-500">
                  {tutor.experience === 0
                    ? 'New tutor'
                    : `${tutor.experience} ${tutor.experience === 1 ? 'year' : 'years'} experience`}
                </p>
              ) : null}
            </div>
            <MatchScore score={score} />
          </div>

          <div className="chips" aria-label="Tutor details">
            {tutor.levels.length > 0
              ? tutor.levels.slice(0, 4).map((level) => (
                  <span key={level} className="chip">
                    {level}
                  </span>
                ))
              : null}
            {tutor.teachingModes.map((mode) => (
              <span key={mode} className="chip" style={{ background: '#f0fdf4', color: '#15803d' }}>
                {formatTeachingMode(mode)}
              </span>
            ))}
            {tutor.location ? (
              <span className="chip" style={{ background: '#fef3c7', color: '#92400e' }}>
                {tutor.location}
              </span>
            ) : null}
            {typeof tutor.hourlyRate === 'number' ? (
              <span className="chip" style={{ background: '#ede9fe', color: '#6d28d9' }}>
                ${tutor.hourlyRate}/hr
              </span>
            ) : null}
          </div>

          <MatchReasons reasons={matchReasons} />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
        <div className="text-xs text-slate-500">
          {tutor.serviceAreas.length > 0 ? (
            <>Service areas: {tutor.serviceAreas.join(', ')}</>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2 ml-auto">
          <Link
            href={`/tutors/${tutor.id}`}
            className="btn btn-sm btn-secondary"
            aria-label={`View ${tutor.name} profile`}
          >
            View Profile
          </Link>
          <button
            type="button"
            className="btn btn-sm"
            onClick={onSelect}
            disabled={!canSelect}
            title={selectDisabledReason}
            aria-label={
              selectDisabledReason
                ? `Select tutor disabled: ${selectDisabledReason}`
                : `Select ${tutor.name}`
            }
          >
            Select Tutor
          </button>
        </div>
      </div>
    </article>
  );
}
