'use client';

import { useRef, useState } from 'react';
import { api } from '../../lib/api';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
const MAX_BYTES = 5 * 1024 * 1024;

export function AvatarUpload({
  currentUrl,
  onPhotoChanged,
}: {
  currentUrl: string | null;
  onPhotoChanged: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setStatus('error');
      setStatusMessage('Please choose a JPG, PNG, WebP, GIF or AVIF image.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setStatus('error');
      setStatusMessage('The image must be 5 MB or smaller.');
      return;
    }
    setStatus('uploading');
    setStatusMessage(null);
    try {
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      const { photoUrl } = await api.uploadClientProfilePhoto(file, file.name);
      URL.revokeObjectURL(objectUrl);
      setPreview(photoUrl);
      onPhotoChanged(photoUrl);
      setStatus('idle');
      setStatusMessage('Photo updated.');
    } catch (err) {
      setStatus('error');
      setStatusMessage(err instanceof Error ? err.message : 'Photo upload failed.');
    }
  }

  return (
    <div className="avatar-upload">
      <div className="avatar-row">
        <div className="avatar-circle" aria-hidden="true">
          {preview ? <img className="avatar img" src={preview} alt="" /> : <span>?</span>}
          {status === 'uploading' ? <span className="avatar-loading" role="status" aria-live="polite" /> : null}
        </div>
        <div className="avatar-controls">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            style={{ display: 'none' }}
            onChange={(event) => void handleFile(event.target.files?.[0])}
          />
          <button
            className="btn btn-sm btn-secondary"
            type="button"
            disabled={status === 'uploading'}
            onClick={() => inputRef.current?.click()}
          >
            {status === 'uploading' ? 'Uploading…' : 'Change photo'}
          </button>
          {status === 'error' && statusMessage ? (
            <p role="alert" className="avatar-error">{statusMessage}</p>
          ) : null}
          {status === 'idle' && statusMessage ? (
            <p role="status" className="avatar-success">{statusMessage}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}