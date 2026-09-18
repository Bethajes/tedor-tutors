'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CircleAlert, LoaderCircle, Plus, X } from 'lucide-react';
import type { CreateLearnerRequest, Gender, Learner, UpdateLearnerRequest } from '@tedor/types';
import { GENDERS } from '@tedor/types';
import {
  createLearnerSchema,
  type CreateLearnerInput,
} from '@tedor/validation';
import { ErrorAlert } from '../auth/error-alert';
import { api } from '../../lib/api';
import { Card } from './card';
import { messageFromError } from './use-api-resource';

const GENDER_LABELS: Record<Gender, string> = {
  MALE: 'Male',
  FEMALE: 'Female',
  OTHER: 'Other',
  PREFER_NOT_TO_SAY: 'Prefer not to say',
};

const inputClass =
  'w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-xs transition-colors placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-50';

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p
      id={id}
      role="alert"
      className="animate-alert-in mt-1.5 flex items-center gap-1 text-xs font-medium text-red-600"
    >
      <CircleAlert className="size-3.5 shrink-0" aria-hidden="true" />
      {message}
    </p>
  );
}

function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return '';
  return iso.slice(0, 10);
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
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateLearnerInput>({
    // The form always submits complete values, so the create schema's
    // required names apply in both add and edit modes.
    resolver: zodResolver(createLearnerSchema),
    defaultValues: {
      firstName: learner?.firstName ?? '',
      lastName: learner?.lastName ?? '',
      dateOfBirth: toDateInputValue(learner?.dateOfBirth) || undefined,
      gender: learner?.gender ?? undefined,
      grade: learner?.grade ?? '',
      school: learner?.school ?? '',
      curriculum: learner?.curriculum ?? '',
      subjects: learner?.subjects ?? [],
      goals: learner?.goals ?? '',
      preferredLanguage: learner?.preferredLanguage ?? '',
      notes: learner?.notes ?? '',
    },
  });

  const [subjectDraft, setSubjectDraft] = useState('');
  const [subjectTags, setSubjectTags] = useState<string[]>(learner?.subjects ?? []);

  function commitSubjectTags(next: string[]) {
    setSubjectTags(next);
    setValue('subjects', next, { shouldValidate: true, shouldDirty: true });
  }

  function addSubjectDraft() {
    const candidates = subjectDraft
      .split(',')
      .map((item) => item.trim().replace(/\s+/g, ' '))
      .filter(Boolean);
    if (candidates.length === 0) return;
    const seen = new Set(subjectTags.map((tag) => tag.toLowerCase()));
    const merged = [...subjectTags];
    for (const candidate of candidates) {
      if (!seen.has(candidate.toLowerCase()) && merged.length < 20) {
        seen.add(candidate.toLowerCase());
        merged.push(candidate);
      }
    }
    setSubjectDraft('');
    commitSubjectTags(merged);
  }

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      const saved = learner
        ? await api.updateLearner(learner.id, values as unknown as UpdateLearnerRequest)
        : await api.createLearner(values as unknown as CreateLearnerRequest);
      onSaved(saved);
    } catch (err) {
      setServerError(messageFromError(err));
    }
  });

  const subjectsError =
    errors.subjects?.message ??
    (Array.isArray(errors.subjects)
      ? errors.subjects.find((entry) => entry?.message)?.message
      : undefined);

  return (
    <Card
      title={learner ? 'Edit learner' : 'Add a learner'}
      subtitle={
        learner
          ? 'Update their details so matching stays accurate'
          : 'Tell us about the learner so we can find the right tutor'
      }
      actions={[
        <button
          key="cancel"
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
          type="button"
          onClick={onCancel}
        >
          Cancel
        </button>,
      ]}
    >
      {serverError ? (
        <div className="mb-5">
          <ErrorAlert message={serverError} onDismiss={() => setServerError(null)} />
        </div>
      ) : null}
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="learner-firstName" className="mb-1.5 block text-sm font-medium text-slate-700">
              First name
            </label>
            <input
              id="learner-firstName"
              autoComplete="off"
              placeholder="Grace"
              aria-invalid={errors.firstName ? true : undefined}
              aria-describedby={errors.firstName ? 'learner-firstName-error' : undefined}
              className={`${inputClass} ${errors.firstName ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-slate-300'}`}
              {...register('firstName')}
            />
            <FieldError id="learner-firstName-error" message={errors.firstName?.message} />
          </div>
          <div>
            <label htmlFor="learner-lastName" className="mb-1.5 block text-sm font-medium text-slate-700">
              Last name
            </label>
            <input
              id="learner-lastName"
              autoComplete="off"
              placeholder="Hopper"
              aria-invalid={errors.lastName ? true : undefined}
              aria-describedby={errors.lastName ? 'learner-lastName-error' : undefined}
              className={`${inputClass} ${errors.lastName ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-slate-300'}`}
              {...register('lastName')}
            />
            <FieldError id="learner-lastName-error" message={errors.lastName?.message} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="learner-dateOfBirth" className="mb-1.5 block text-sm font-medium text-slate-700">
              Date of birth
            </label>
            <input
              id="learner-dateOfBirth"
              type="date"
              aria-invalid={errors.dateOfBirth ? true : undefined}
              aria-describedby={errors.dateOfBirth ? 'learner-dateOfBirth-error' : undefined}
              className={`${inputClass} ${errors.dateOfBirth ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-slate-300'}`}
              {...register('dateOfBirth', { setValueAs: (value: string) => value || undefined })}
            />
            <FieldError id="learner-dateOfBirth-error" message={errors.dateOfBirth?.message} />
          </div>
          <div>
            <label htmlFor="learner-gender" className="mb-1.5 block text-sm font-medium text-slate-700">
              Gender
            </label>
            <select
              id="learner-gender"
              aria-invalid={errors.gender ? true : undefined}
              aria-describedby={errors.gender ? 'learner-gender-error' : undefined}
              className={`${inputClass} ${errors.gender ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-slate-300'}`}
              {...register('gender', {
                setValueAs: (value: string) => (value ? (value as Gender) : undefined),
              })}
            >
              <option value="">Not specified</option>
              {GENDERS.map((option) => (
                <option key={option} value={option}>
                  {GENDER_LABELS[option]}
                </option>
              ))}
            </select>
            <FieldError id="learner-gender-error" message={errors.gender?.message} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="learner-grade" className="mb-1.5 block text-sm font-medium text-slate-700">
              Grade
            </label>
            <input
              id="learner-grade"
              placeholder="e.g. Grade 7"
              aria-invalid={errors.grade ? true : undefined}
              aria-describedby={errors.grade ? 'learner-grade-error' : undefined}
              className={`${inputClass} ${errors.grade ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-slate-300'}`}
              {...register('grade')}
            />
            <FieldError id="learner-grade-error" message={errors.grade?.message} />
          </div>
          <div>
            <label htmlFor="learner-curriculum" className="mb-1.5 block text-sm font-medium text-slate-700">
              Curriculum
            </label>
            <input
              id="learner-curriculum"
              placeholder="e.g. IB, IGCSE"
              aria-invalid={errors.curriculum ? true : undefined}
              aria-describedby={errors.curriculum ? 'learner-curriculum-error' : undefined}
              className={`${inputClass} ${errors.curriculum ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-slate-300'}`}
              {...register('curriculum')}
            />
            <FieldError id="learner-curriculum-error" message={errors.curriculum?.message} />
          </div>
        </div>

        <div>
          <label htmlFor="learner-school" className="mb-1.5 block text-sm font-medium text-slate-700">
            School
          </label>
          <input
            id="learner-school"
            placeholder="School name (optional)"
            aria-invalid={errors.school ? true : undefined}
            aria-describedby={errors.school ? 'learner-school-error' : undefined}
            className={`${inputClass} ${errors.school ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-slate-300'}`}
            {...register('school')}
          />
          <FieldError id="learner-school-error" message={errors.school?.message} />
        </div>

        <div>
          <span id="learner-subjects-label" className="mb-1.5 block text-sm font-medium text-slate-700">
            Subjects
          </span>
          {subjectTags.length > 0 ? (
            <div className="mb-2 flex flex-wrap gap-1.5" aria-live="polite">
              {subjectTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-indigo-50 py-1 pr-1.5 pl-2.5 text-xs font-medium text-indigo-700 ring-1 ring-indigo-100 ring-inset"
                >
                  {tag}
                  <button
                    type="button"
                    aria-label={`Remove ${tag}`}
                    onClick={() => commitSubjectTags(subjectTags.filter((item) => item !== tag))}
                    className="rounded-full p-0.5 text-indigo-400 transition-colors hover:bg-indigo-100 hover:text-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
                  >
                    <X className="size-3" aria-hidden="true" />
                  </button>
                </span>
              ))}
            </div>
          ) : null}
          <div className="flex gap-2">
            <input
              id="learner-subjects"
              value={subjectDraft}
              onChange={(event) => setSubjectDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ',') {
                  event.preventDefault();
                  addSubjectDraft();
                }
              }}
              onBlur={() => {
                if (subjectDraft.trim()) addSubjectDraft();
              }}
              placeholder="Type a subject and press Enter"
              aria-describedby="learner-subjects-hint learner-subjects-error"
              className={`${inputClass} ${subjectsError ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-slate-300'}`}
            />
            <button
              type="button"
              onClick={addSubjectDraft}
              disabled={!subjectDraft.trim()}
              className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none disabled:opacity-50"
            >
              <Plus className="size-4" aria-hidden="true" />
              <span className="sr-only">Add subject</span>
            </button>
          </div>
          <p id="learner-subjects-hint" className="mt-1 text-xs text-slate-400">
            Up to 20 subjects — e.g. Math, Science, English
          </p>
          <FieldError id="learner-subjects-error" message={subjectsError} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="learner-language" className="mb-1.5 block text-sm font-medium text-slate-700">
              Preferred language
            </label>
            <input
              id="learner-language"
              placeholder="English"
              aria-invalid={errors.preferredLanguage ? true : undefined}
              aria-describedby={errors.preferredLanguage ? 'learner-language-error' : undefined}
              className={`${inputClass} ${errors.preferredLanguage ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-slate-300'}`}
              {...register('preferredLanguage')}
            />
            <FieldError id="learner-language-error" message={errors.preferredLanguage?.message} />
          </div>
          <div>
            <label htmlFor="learner-goals" className="mb-1.5 block text-sm font-medium text-slate-700">
              Goals
            </label>
            <input
              id="learner-goals"
              placeholder="e.g. Improve grades"
              aria-invalid={errors.goals ? true : undefined}
              aria-describedby={errors.goals ? 'learner-goals-error' : undefined}
              className={`${inputClass} ${errors.goals ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-slate-300'}`}
              {...register('goals')}
            />
            <FieldError id="learner-goals-error" message={errors.goals?.message} />
          </div>
        </div>

        <div>
          <label htmlFor="learner-notes" className="mb-1.5 block text-sm font-medium text-slate-700">
            Notes for tutors
          </label>
          <textarea
            id="learner-notes"
            rows={3}
            placeholder="Anything a tutor should know — schedule, preferences, context"
            aria-invalid={errors.notes ? true : undefined}
            aria-describedby={errors.notes ? 'learner-notes-error' : undefined}
            className={`${inputClass} resize-y ${errors.notes ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-slate-300'}`}
            {...register('notes')}
          />
          <FieldError id="learner-notes-error" message={errors.notes?.message} />
        </div>

        <button
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/30 transition-all hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-8"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              Saving…
            </>
          ) : (
            submitLabel
          )}
        </button>
      </form>
    </Card>
  );
}
