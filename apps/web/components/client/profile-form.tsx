'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CircleAlert, LoaderCircle } from 'lucide-react';
import type { ClientProfile } from '@tedor/types';
import { updateClientProfileSchema, type UpdateClientProfileInput } from '@tedor/validation';
import { ErrorAlert } from '../auth/error-alert';
import { api } from '../../lib/api';
import { AvatarUpload } from './avatar-upload';
import { Card } from './card';
import { messageFromError } from './use-api-resource';

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

export function ProfileForm({
  profile,
  onSaved,
  onCancel,
}: {
  profile: ClientProfile;
  onSaved: (updated: ClientProfile) => void;
  onCancel: () => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState(profile.photoUrl ?? '');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdateClientProfileInput>({
    resolver: zodResolver(updateClientProfileSchema),
    defaultValues: {
      firstName: profile.firstName,
      lastName: profile.lastName,
      phone: profile.phone ?? '',
      preferredLanguage: profile.preferredLanguage ?? '',
      location: profile.location ?? '',
      address: profile.address ?? '',
      bio: profile.bio ?? '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      const updated = await api.updateClientProfile({ ...values, photoUrl: photoUrl || null });
      onSaved(updated);
    } catch (err) {
      setServerError(messageFromError(err));
    }
  });

  return (
    <Card
      title="Edit profile"
      subtitle="Keep your details current so tutors can reach you"
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
      <AvatarUpload currentUrl={photoUrl} onPhotoChanged={setPhotoUrl} />
      <form onSubmit={onSubmit} noValidate className="mt-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="profile-firstName" className="mb-1.5 block text-sm font-medium text-slate-700">
              First name
            </label>
            <input
              id="profile-firstName"
              autoComplete="given-name"
              placeholder="Ada"
              aria-invalid={errors.firstName ? true : undefined}
              aria-describedby={errors.firstName ? 'profile-firstName-error' : undefined}
              className={`${inputClass} ${errors.firstName ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-slate-300'}`}
              {...register('firstName')}
            />
            <FieldError id="profile-firstName-error" message={errors.firstName?.message} />
          </div>
          <div>
            <label htmlFor="profile-lastName" className="mb-1.5 block text-sm font-medium text-slate-700">
              Last name
            </label>
            <input
              id="profile-lastName"
              autoComplete="family-name"
              placeholder="Lovelace"
              aria-invalid={errors.lastName ? true : undefined}
              aria-describedby={errors.lastName ? 'profile-lastName-error' : undefined}
              className={`${inputClass} ${errors.lastName ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-slate-300'}`}
              {...register('lastName')}
            />
            <FieldError id="profile-lastName-error" message={errors.lastName?.message} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="profile-phone" className="mb-1.5 block text-sm font-medium text-slate-700">
              Phone
            </label>
            <input
              id="profile-phone"
              type="tel"
              autoComplete="tel"
              placeholder="+12345678901"
              aria-invalid={errors.phone ? true : undefined}
              aria-describedby={errors.phone ? 'profile-phone-error' : undefined}
              className={`${inputClass} ${errors.phone ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-slate-300'}`}
              {...register('phone')}
            />
            <FieldError id="profile-phone-error" message={errors.phone?.message} />
            <p className="mt-1 text-xs text-slate-400">E.164 format, e.g. +380501234567</p>
          </div>
          <div>
            <label htmlFor="profile-language" className="mb-1.5 block text-sm font-medium text-slate-700">
              Preferred language
            </label>
            <input
              id="profile-language"
              placeholder="English"
              aria-invalid={errors.preferredLanguage ? true : undefined}
              aria-describedby={errors.preferredLanguage ? 'profile-language-error' : undefined}
              className={`${inputClass} ${errors.preferredLanguage ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-slate-300'}`}
              {...register('preferredLanguage')}
            />
            <FieldError id="profile-language-error" message={errors.preferredLanguage?.message} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="profile-location" className="mb-1.5 block text-sm font-medium text-slate-700">
              Location
            </label>
            <input
              id="profile-location"
              placeholder="San Francisco, CA"
              aria-invalid={errors.location ? true : undefined}
              aria-describedby={errors.location ? 'profile-location-error' : undefined}
              className={`${inputClass} ${errors.location ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-slate-300'}`}
              {...register('location')}
            />
            <FieldError id="profile-location-error" message={errors.location?.message} />
          </div>
          <div>
            <label htmlFor="profile-address" className="mb-1.5 block text-sm font-medium text-slate-700">
              Address
            </label>
            <input
              id="profile-address"
              autoComplete="street-address"
              placeholder="Service area or street address"
              aria-invalid={errors.address ? true : undefined}
              aria-describedby={errors.address ? 'profile-address-error' : undefined}
              className={`${inputClass} ${errors.address ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-slate-300'}`}
              {...register('address')}
            />
            <FieldError id="profile-address-error" message={errors.address?.message} />
          </div>
        </div>

        <div>
          <label htmlFor="profile-bio" className="mb-1.5 block text-sm font-medium text-slate-700">
            Bio
          </label>
          <textarea
            id="profile-bio"
            rows={4}
            placeholder="Tell tutors a little about how you like to work"
            aria-invalid={errors.bio ? true : undefined}
            aria-describedby={errors.bio ? 'profile-bio-error' : undefined}
            className={`${inputClass} resize-y ${errors.bio ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-slate-300'}`}
            {...register('bio')}
          />
          <FieldError id="profile-bio-error" message={errors.bio?.message} />
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
            'Save profile'
          )}
        </button>
      </form>
    </Card>
  );
}
