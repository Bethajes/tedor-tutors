'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, LoaderCircle } from 'lucide-react';
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
  const [preview, setPreview] = useState<string | null>(currentUrl || null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Keep the preview in sync when the parent value changes (e.g. after save).
  useEffect(() => {
    setPreview(currentUrl || null);
  }, [currentUrl]);

  // Revoke blob previews on unmount to avoid leaking object URLs.
  const previewRef = useRef<string | null>(null);
  useEffect(() => {
    previewRef.current = preview;
    return () => {
      if (previewRef.current?.startsWith('blob:')) URL.revokeObjectURL(previewRef.current);
    };
  }, [preview]);

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
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    try {
      const { photoUrl } = await api.uploadClientProfilePhoto(file, file.name);
      URL.revokeObjectURL(objectUrl);
      setPreview(photoUrl);
      onPhotoChanged(photoUrl);
      setStatus('idle');
      setStatusMessage('Photo updated — remember to save your profile.');
    } catch (err) {
      URL.revokeObjectURL(objectUrl);
      setPreview(currentUrl || null);
      setStatus('error');
      setStatusMessage(err instanceof Error ? err.message : 'Photo upload failed.');
    }
  }

  return (
    <div className="flex items-center gap-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-4">
      <div className="relative shrink-0">
        {preview ? (
          <img
            className="size-16 rounded-2xl object-cover ring-1 ring-slate-200"
            src={preview}
            alt="Profile photo preview"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 text-xl font-bold text-indigo-400"
          >
            ?
          </span>
        )}
        {status === 'uploading' ? (
          <span className="absolute inset-0 flex items-center justify-center rounded-2xl bg-slate-950/40">
            <LoaderCircle className="size-5 animate-spin text-white" aria-hidden="true" />
            <span className="sr-only">Uploading photo…</span>
          </span>
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900">Profile photo</p>
        <p className="mt-0.5 text-xs text-slate-500">JPG, PNG, WebP, GIF or AVIF · max 5 MB</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            className="hidden"
            aria-label="Choose a profile photo"
            onChange={(event) => {
              void handleFile(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
          <button
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none disabled:opacity-60"
            type="button"
            disabled={status === 'uploading'}
            onClick={() => inputRef.current?.click()}
          >
            <Camera className="size-3.5" aria-hidden="true" />
            {status === 'uploading' ? 'Uploading…' : preview ? 'Change photo' : 'Upload photo'}
          </button>
        </div>
        {status === 'error' && statusMessage ? (
          <p role="alert" className="mt-1.5 text-xs font-medium text-red-600">
            {statusMessage}
          </p>
        ) : null}
        {status === 'idle' && statusMessage ? (
          <p role="status" className="mt-1.5 text-xs font-medium text-emerald-600">
            {statusMessage}
          </p>
        ) : null}
      </div>
    </div>
  );
}
