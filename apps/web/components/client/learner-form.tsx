'use client';

import { useState } from 'react';
import type { CreateLearnerRequest, Gender, Learner, UpdateLearnerRequest } from '@tedor/types';
import { GENDERS } from '@tedor/types';
import { createLearnerSchema, updateLearnerSchema } from '@tedor/validation';
import { ErrorBanner } from '@tedor/ui';
import { api } from '../../lib/api';
import { Card } from './card';
import { messageFromError } from './use-api-resource';

const GENDER_LABELS: Record<Gender, string> = {
  MALE: 'Male',
  FEMALE: 'Female',
  OTHER: 'Other',
  PREFER_NOT_TO_SAY: 'Prefer not to say',
};

function splitSubjects(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function LearnerForm({
  learner,
  submitLabel,
  onSaved,
  onCancel,
}: {
  learner?: Learner;
  submitLabel: string;
  onSaved: (saved: Learner) => void;
  onCancel: () => void;
}) {
  const [firstName, setFirstName] = useState(learner?.firstName ?? '');
  const [lastName, setLastName] = useState(learner?.lastName ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(learner?.dateOfBirth ?? '');
  const [gender, setGender] = useState<Gender | ''>(learner?.gender ?? '');
  const [grade, setGrade] = useState(learner?.grade ?? '');
  const [school, setSchool] = useState(learner?.school ?? '');
  const [curriculum, setCurriculum] = useState(learner?.curriculum ?? '');
  const [subjects, setSubjects] = useState(learner?.subjects.join(', ') ?? '');
  const [goals, setGoals] = useState(learner?.goals ?? '');
  const [preferredLanguage, setPreferredLanguage] = useState(learner?.preferredLanguage ?? '');
  const [notes, setNotes] = useState(learner?.notes ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const payload = {
      firstName,
      lastName,
      dateOfBirth: dateOfBirth || undefined,
      gender: gender || undefined,
      grade,
      school,
      curriculum,
      subjects: splitSubjects(subjects),
      goals,
      preferredLanguage,
      notes,
    };
    const parse = learner ? updateLearnerSchema : createLearnerSchema;
    const parsed = parse.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? 'Check your input');
      return;
    }
    setSaving(true);
    try {
      const request = parsed.data as unknown as CreateLearnerRequest;
      const saved = learner
        ? await api.updateLearner(learner.id, request as UpdateLearnerRequest)
        : await api.createLearner(request);
      onSaved(saved);
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card
      title={learner ? 'Edit learner' : 'Add a learner'}
      actions={[
        <button key="cancel" className="btn btn-sm btn-secondary" type="button" onClick={onCancel}>
          Cancel
        </button>,
      ]}
    >
      {error ? <ErrorBanner message={error} /> : null}
      <form onSubmit={handleSubmit} noValidate>
        <div className="form-fields">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' }}>
            <div>
              <label htmlFor="learner-firstName">First name</label>
              <input id="learner-firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            </div>
            <div>
              <label htmlFor="learner-lastName">Last name</label>
              <input id="learner-lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' }}>
            <div>
              <label htmlFor="learner-dateOfBirth">Date of birth</label>
              <input id="learner-dateOfBirth" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
            </div>
            <div>
              <label htmlFor="learner-gender">Gender</label>
              <select id="learner-gender" value={gender} onChange={(e) => setGender(e.target.value as Gender | '')}>
                <option value="">Not specified</option>
                {GENDERS.map((option) => (
                  <option key={option} value={option}>
                    {GENDER_LABELS[option]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' }}>
            <div>
              <label htmlFor="learner-grade">Grade</label>
              <input id="learner-grade" placeholder="e.g. Grade 7" value={grade} onChange={(e) => setGrade(e.target.value)} />
            </div>
            <div>
              <label htmlFor="learner-curriculum">Curriculum</label>
              <input id="learner-curriculum" placeholder="e.g. IB, IGCSE" value={curriculum} onChange={(e) => setCurriculum(e.target.value)} />
            </div>
          </div>
          <div>
            <label htmlFor="learner-school">School</label>
            <input id="learner-school" value={school} onChange={(e) => setSchool(e.target.value)} />
          </div>
          <div>
            <label htmlFor="learner-subjects">Subjects (comma separated)</label>
            <input id="learner-subjects" placeholder="Math, Science, English" value={subjects} onChange={(e) => setSubjects(e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' }}>
            <div>
              <label htmlFor="learner-language">Preferred language</label>
              <input id="learner-language" value={preferredLanguage} onChange={(e) => setPreferredLanguage(e.target.value)} />
            </div>
            <div>
              <label htmlFor="learner-goals">Goals</label>
              <input id="learner-goals" placeholder="e.g. Improve grades" value={goals} onChange={(e) => setGoals(e.target.value)} />
            </div>
          </div>
          <div>
            <label htmlFor="learner-notes">Notes</label>
            <textarea id="learner-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <button className="btn" type="submit" disabled={saving}>
          {saving ? 'Saving…' : submitLabel}
        </button>
      </form>
    </Card>
  );
}