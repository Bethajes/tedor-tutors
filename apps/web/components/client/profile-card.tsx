'use client';

import type { ClientProfile } from '@tedor/types';
import { Card } from './card';

const FIELD_LABELS: Array<[key: keyof ClientProfile, label: string]> = [
  ['phone', 'Phone'],
  ['preferredLanguage', 'Preferred language'],
  ['location', 'Location'],
  ['address', 'Address'],
  ['bio', 'Bio'],
];

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
      subtitle={profile.user.email}
      actions={[
        <button key="edit" className="btn btn-sm btn-secondary" type="button" onClick={onEdit}>
          Edit
        </button>,
      ]}
    >
      <div className="profile-summary">
        {profile.photoUrl ? (
          <img className="avatar" src={profile.photoUrl} alt={fullName} />
        ) : (
          <div className="avatar avatar-placeholder" aria-hidden="true">
            {fullName.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <h3 style={{ margin: 0 }}>{fullName}</h3>
          <p className="muted" style={{ margin: '0.2rem 0 0' }}>{profile.user.email}</p>
        </div>
      </div>
      <dl className="detail-list" style={{ marginTop: '1rem' }}>
        {FIELD_LABELS.map(([key, label]) => (
          <div key={key}>
            <dt>{label}</dt>
            <dd>{profile[key] && String(profile[key]).trim() ? String(profile[key]) : '—'}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}