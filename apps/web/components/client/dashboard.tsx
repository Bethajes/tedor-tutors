'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  CircleAlert,
  GraduationCap,
  Plus,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { ErrorBanner, Spinner } from '@tedor/ui';
import { api } from '../../lib/api';
import { Card } from './card';
import { LearnerAvatar, PageHeader, ProfileCompleteness, StatCard, SubjectChips } from './client-ui';
import { EmptyState } from './empty-state';
import { useApiResource } from './use-api-resource';

export function ClientDashboard() {
  const router = useRouter();
  const dashboard = useApiResource(() => api.getClientDashboard());

  if (dashboard.error) {
    return (
      <>
        <PageHeader
          eyebrow="Client home"
          title="Dashboard"
          description="Your learners, profile, and next steps at a glance."
        />
        <ErrorBanner message={dashboard.error} onRetry={dashboard.reload} />
      </>
    );
  }

  if (dashboard.loading && !dashboard.data) {
    return (
      <>
        <PageHeader
          eyebrow="Client home"
          title="Dashboard"
          description="Your learners, profile, and next steps at a glance."
        />
        <Spinner label="Loading dashboard…" />
      </>
    );
  }

  const data = dashboard.data;
  if (!data) return null;

  const { profile, stats, recentLearners } = data;
  const fullName = `${profile.firstName} ${profile.lastName}`.trim();
  const contactLine =
    [profile.phone, profile.location].filter(Boolean).join(' · ') || 'No contact details yet';

  const nextSteps: Array<{ done: boolean; label: string; href: string }> = [
    {
      done: profile.user.emailVerified,
      label: 'Verify your email address',
      href: '/verify-email',
    },
    {
      done: stats.profileCompleteness >= 80,
      label: 'Complete your profile (photo, phone, location)',
      href: '/profile',
    },
    {
      done: stats.totalLearners > 0,
      label: 'Add your first learner',
      href: '/learners/new',
    },
  ];
  const doneCount = nextSteps.filter((step) => step.done).length;

  return (
    <>
      <PageHeader
        eyebrow="Client home"
        title={`Welcome back, ${profile.firstName}`}
        description="Here's what's happening with your tutoring journey."
        actions={[
          <Link
            key="add"
            href="/learners/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white no-underline shadow-sm shadow-indigo-600/30 transition-colors hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <Plus className="size-4" aria-hidden="true" />
            Add learner
          </Link>,
          <Link
            key="profile"
            href="/profile"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 no-underline shadow-sm transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
          >
            View profile
          </Link>,
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={<GraduationCap className="size-5" aria-hidden="true" />}
          label="Learners"
          value={String(stats.totalLearners)}
          hint={stats.totalLearners === 1 ? 'learner on your account' : 'learners on your account'}
        />
        <StatCard
          icon={<BookOpen className="size-5" aria-hidden="true" />}
          label="Subjects covered"
          value={String(stats.subjectsCovered)}
          hint="distinct subjects across learners"
        />
        <StatCard
          icon={<UserRound className="size-5" aria-hidden="true" />}
          label="Profile"
          value={`${stats.profileCompleteness}%`}
          hint="complete — keep it fresh for tutors"
        />
      </div>

      {!profile.user.emailVerified ? (
        <div
          role="alert"
          className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm"
        >
          <CircleAlert className="mt-0.5 size-4.5 shrink-0 text-amber-500" aria-hidden="true" />
          <p className="leading-relaxed text-amber-900">
            Your email is not verified yet.{' '}
            <Link
              href="/verify-email"
              className="font-semibold text-amber-900 underline underline-offset-2 hover:text-amber-700"
            >
              Verify it now
            </Link>{' '}
            so tutors can reach you without delays.
          </p>
        </div>
      ) : null}

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <Card
            title="My learners"
            subtitle={
              stats.totalLearners === 0
                ? 'Track the young learners you manage'
                : `${stats.totalLearners} ${stats.totalLearners === 1 ? 'learner' : 'learners'} · ${stats.subjectsCovered} ${stats.subjectsCovered === 1 ? 'subject' : 'subjects'}`
            }
            actions={[
              <Link
                key="all"
                href="/learners"
                className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-semibold text-indigo-600 no-underline transition-colors hover:bg-indigo-50 hover:text-indigo-700"
              >
                View all
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>,
            ]}
          >
            {recentLearners.length === 0 ? (
              <EmptyState
                title="No learners yet"
                description="Add your first learner to start building their tutor profile."
                actionLabel="Add a learner"
                onAction={() => router.push('/learners/new')}
              />
            ) : (
              <ul className="divide-y divide-slate-100">
                {recentLearners.map((learner) => {
                  const meta = [
                    learner.age != null ? `Age ${learner.age}` : null,
                    learner.grade,
                  ]
                    .filter(Boolean)
                    .join(' · ');
                  return (
                    <li key={learner.id}>
                      <Link
                        href={`/learners/${learner.id}`}
                        className="flex items-center gap-3 rounded-xl px-2 py-3 no-underline transition-colors hover:bg-slate-50"
                      >
                        <LearnerAvatar
                          firstName={learner.firstName}
                          lastName={learner.lastName}
                          size="md"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {learner.firstName} {learner.lastName}
                          </p>
                          {meta ? <p className="mt-0.5 text-xs text-slate-500">{meta}</p> : null}
                          {learner.subjects.length > 0 ? (
                            <div className="mt-1.5">
                              <SubjectChips subjects={learner.subjects} />
                            </div>
                          ) : null}
                        </div>
                        <ArrowRight
                          className="size-4 shrink-0 text-slate-300"
                          aria-hidden="true"
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card
            title="Getting started"
            subtitle={`${doneCount} of ${nextSteps.length} steps complete`}
          >
            <ul className="space-y-2.5">
              {nextSteps.map((step) => (
                <li key={step.label}>
                  <Link
                    href={step.href}
                    className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3.5 py-3 no-underline transition-colors hover:border-indigo-100 hover:bg-indigo-50/50"
                  >
                    <span
                      className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        step.done ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-400 ring-1 ring-slate-200 ring-inset'
                      }`}
                      aria-hidden="true"
                    >
                      {step.done ? '✓' : '·'}
                    </span>
                    <span className={`flex-1 text-sm ${step.done ? 'text-slate-400 line-through' : 'font-medium text-slate-700'}`}>
                      {step.label}
                    </span>
                    <ArrowRight className="size-4 shrink-0 text-slate-300" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <Card title="Profile" subtitle={fullName}>
            <div className="flex items-center gap-3">
              {profile.photoUrl ? (
                <img
                  className="size-14 rounded-2xl object-cover ring-1 ring-slate-200"
                  src={profile.photoUrl}
                  alt={fullName}
                />
              ) : (
                <LearnerAvatar
                  firstName={profile.firstName}
                  lastName={profile.lastName}
                  size="lg"
                />
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{fullName}</p>
                <p className="truncate text-xs text-slate-500">{profile.user.email}</p>
                {profile.user.emailVerified ? (
                  <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                    <BadgeCheck className="size-3.5" aria-hidden="true" />
                    Verified
                  </p>
                ) : null}
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">{contactLine}</p>
            <div className="mt-4">
              <ProfileCompleteness value={stats.profileCompleteness} />
            </div>
            <Link
              href="/profile"
              className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 no-underline transition-colors hover:bg-slate-50"
            >
              Edit profile
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </Card>

          <Card
            title="Find a tutor"
            subtitle="Tell us what each learner needs and we'll match you"
          >
            <div className="flex items-start gap-3 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 p-4 text-white">
              <Sparkles className="size-5 shrink-0" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold">Personalised matching</p>
                <p className="mt-1 text-xs leading-relaxed text-indigo-100">
                  Complete your learners' subjects and goals to unlock tutor recommendations.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
