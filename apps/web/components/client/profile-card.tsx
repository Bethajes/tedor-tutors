'use client';

import { BadgeCheck, Home, Languages, MapPin, Phone, Quote } from 'lucide-react';
import type { ClientProfile } from '@tedor/types';
import { Card } from './card';
import { LearnerAvatar } from './client-ui';

const FIELD_ROWS = [
  { key: 'phone', label: 'Phone', icon: Phone },
  { key: 'preferredLanguage', label: 'Preferred language', icon: Languages },
  { key: 'location', label: 'Location', icon: MapPin },
  { key: 'address', label: 'Address', icon: Home },
] as const;

export function ProfileCard({
  profile,
  onEdit,
}: {
  profile: ClientProfile;
  onEdit: () => void;
}) {
  const fullName = `${profile.firstName} ${profile.lastName}`.trim();
  return (
    <Card
      title="Profile"
      subtitle="How tutors see you"
      actions={[
        <button
          key="edit"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-600/30 transition-colors hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none"
          type="button"
          onClick={onEdit}
        >
          Edit profile
        </button>,
      ]}
    >
      <div className="flex flex-wrap items-center gap-4">
        {profile.photoUrl ? (
          <img
            className="size-20 rounded-2xl object-cover ring-1 ring-slate-200"
            src={profile.photoUrl}
            alt={fullName}
          />
        ) : (
          <LearnerAvatar firstName={profile.firstName} lastName={profile.lastName} size="lg" />
        )}
        <div className="min-w-0">
          <h3 className="flex flex-wrap items-center gap-2 text-lg font-bold tracking-tight text-slate-900">
            {fullName}
            {profile.user.emailVerified ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100 ring-inset">
                <BadgeCheck className="size-3.5" aria-hidden="true" />
                Verified
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-100 ring-inset">
                Unverified
              </span>
            )}
          </h3>
          <p className="mt-0.5 text-sm text-slate-500">{profile.user.email}</p>
        </div>
      </div>

      <dl className="mt-6 grid gap-3 sm:grid-cols-2">
        {FIELD_ROWS.map(({ key, label, icon: Icon }) => {
          const value = profile[key];
          const display = value && value.trim() ? value : null;
          return (
            <div
              key={key}
              className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3.5 py-3"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-400 ring-1 ring-slate-200 ring-inset">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <dt className="text-xs font-medium text-slate-400">{label}</dt>
                <dd className="mt-0.5 truncate text-sm font-medium text-slate-900">
                  {display ?? <span className="font-normal text-slate-400">Not set</span>}
                </dd>
              </div>
            </div>
          );
        })}
      </dl>

      <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3.5 py-3">
        <div className="flex items-start gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-400 ring-1 ring-slate-200 ring-inset">
            <Quote className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-400">Bio</p>
            <p className="mt-0.5 text-sm leading-relaxed text-slate-700">
              {profile.bio && profile.bio.trim() ? (
                profile.bio
              ) : (
                <span className="text-slate-400">
                  No bio yet — tell tutors a little about how you like to work.
                </span>
              )}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
