'use client';

import { Pencil, Trash2 } from 'lucide-react';
import type { Learner } from '@tedor/types';
import { Card } from './card';
import { LearnerAvatar, SubjectChips } from './client-ui';

export function LearnerCard({
  learner,
  onManage,
  onDelete,
}: {
  learner: Learner;
  onManage: () => void;
  onDelete: () => void;
}) {
  const fullName = `${learner.firstName} ${learner.lastName}`.trim();
  const meta = [learner.age != null ? `Age ${learner.age}` : null, learner.grade, learner.school]
    .filter(Boolean)
    .join(' · ');
  return (
    <Card
      title={fullName}
      subtitle={meta || undefined}
      actions={[
        <button
          key="manage"
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
          type="button"
          onClick={onManage}
        >
          <Pencil className="size-3.5" aria-hidden="true" />
          Manage
        </button>,
        <button
          key="delete"
          aria-label={`Delete ${fullName}`}
          className="inline-flex items-center gap-1 rounded-lg border border-red-100 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 shadow-sm transition-colors hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none"
          type="button"
          onClick={onDelete}
        >
          <Trash2 className="size-3.5" aria-hidden="true" />
          Delete
        </button>,
      ]}
    >
      <div className="flex items-center gap-3">
        <LearnerAvatar firstName={learner.firstName} lastName={learner.lastName} size="md" />
        <div className="min-w-0">
          {learner.curriculum ? (
            <p className="text-xs font-medium text-slate-500">{learner.curriculum}</p>
          ) : null}
          {learner.preferredLanguage ? (
            <p className="mt-0.5 text-xs text-slate-400">{learner.preferredLanguage}</p>
          ) : null}
        </div>
      </div>
      {learner.subjects.length ? (
        <div className="mt-3">
          <SubjectChips subjects={learner.subjects} max={4} />
        </div>
      ) : null}
      {learner.goals ? (
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-500">{learner.goals}</p>
      ) : null}
    </Card>
  );
}
