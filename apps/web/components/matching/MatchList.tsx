'use client';

import { TutorMatchCard, type TutorMatchData } from './TutorMatchCard';

export function MatchList({
  matches,
  onSelectTutor,
  selectDisabledReason,
}: {
  matches: TutorMatchData[];
  onSelectTutor?: (tutorId: string, matchId: string) => void;
  selectDisabledReason?: string;
}) {
  if (matches.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">
          Recommended Tutors
          <span className="ml-2 text-sm font-normal text-slate-500">
            {matches.length} match{matches.length === 1 ? '' : 'es'}
          </span>
        </h2>
        <p className="text-xs text-slate-500">Ranked by best match first</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-2">
        {matches.map((match, idx) => (
          <div key={match.id} style={{ animationDelay: `${Math.min(idx * 40, 320)}ms` }}>
            <TutorMatchCard
              match={match}
              onSelect={
                onSelectTutor ? () => onSelectTutor(match.tutor.id, match.id) : undefined
              }
              selectDisabledReason={selectDisabledReason}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
