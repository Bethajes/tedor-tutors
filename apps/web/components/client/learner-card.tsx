'use client';

import type { Learner } from '@tedor/types';
import { Card } from './card';

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
  const meta = [
    learner.age != null ? `Age ${learner.age}` : null,
    learner.grade,
    learner.school,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <Card
      title={fullName}
      subtitle={meta || undefined}
      actions={[
        <button key="manage" className="btn btn-sm btn-secondary" type="button" onClick={onManage}>
          Manage
        </button>,
        <button key="delete" className="btn btn-sm btn-danger" type="button" onClick={onDelete}>
          Delete
        </button>,
      ]}
    >
      {learner.subjects.length ? (
        <div className="chips">
          {learner.subjects.map((subject) => (
            <span key={subject} className="chip">
              {subject}
            </span>
          ))}
        </div>
      ) : null}
      {learner.goals ? (
        <p className="muted" style={{ margin: '0.75rem 0 0' }}>{learner.goals}</p>
      ) : null}
    </Card>
  );
}