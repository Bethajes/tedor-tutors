'use client';

import { useState } from 'react';
import type { ClientProfile } from '@tedor/types';
import { updateClientProfileSchema } from '@tedor/validation';
import { ErrorBanner } from '@tedor/ui';
import { api } from '../../lib/api';
import { Card } from './card';
import { AvatarUpload } from './avatar-upload';
import { messageFromError } from './use-api-resource';

export function ProfileForm({
  profile,
  onSaved,
  onCancel,
}: {
  profile: ClientProfile;
  onSaved: (updated: ClientProfile) => void;
  onCancel: () => void;
}) {
  const [firstName, setFirstName] = useState(profile.firstName);
  const [lastName, setLastName] = useState(profile.lastName);
  const [phone, setPhone] = useState(profile.phone ?? '');
  const [preferredLanguage, setPreferredLanguage] = useState(profile.preferredLanguage ?? '');
  const [location, setLocation] = useState(profile.location ?? '');
  const [address, setAddress] = useState(profile.address ?? '');
  const [bio, setBio] = useState(profile.bio ?? '');
  const [photoUrl, setPhotoUrl] = useState(profile.photoUrl ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const parsed = updateClientProfileSchema.safeParse({
      firstName,
      lastName,
      phone,
      preferredLanguage,
      location,
      address,
      bio,
      photoUrl,
    });
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? 'Check your input');
      return;
    }
    setSaving(true);
    try {
      const updated = await api.updateClientProfile({
        ...parsed.data,
        photoUrl: photoUrl || null,
      });
      onSaved(updated);
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card
      title="Edit profile"
      actions={[
        <button key="cancel" className="btn btn-sm btn-secondary" type="button" onClick={onCancel}>
          Cancel
        </button>,
      ]}
    >
      {error ? <ErrorBanner message={error} /> : null}
      <AvatarUpload currentUrl={photoUrl} onPhotoChanged={setPhotoUrl} />
      <form onSubmit={handleSubmit} noValidate>
        <div className="form-fields">
          <div>
            <label htmlFor="firstName">First name</label>
            <input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          </div>
          <div>
            <label htmlFor="lastName">Last name</label>
            <input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          </div>
          <div>
            <label htmlFor="phone">Phone (E.164)</label>
            <input id="phone" type="tel" placeholder="+12345678901" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <label htmlFor="preferredLanguage">Preferred language</label>
            <input id="preferredLanguage" value={preferredLanguage} onChange={(e) => setPreferredLanguage(e.target.value)} />
          </div>
          <div>
            <label htmlFor="location">Location</label>
            <input id="location" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div>
            <label htmlFor="address">Address</label>
            <input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div>
            <label htmlFor="bio">Bio</label>
            <textarea id="bio" rows={4} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell tutors a little about how you like to work" />
          </div>
        </div>
        <button className="btn" type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save profile'}
        </button>
      </form>
    </Card>
  );
}