'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiConnectionError, ApiError } from '@tedor/api-client';

interface ApiResourceState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
}

export function useApiResource<T>(loader: () => Promise<T>): ApiResourceState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const reload = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    loaderRef
      .current()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setData(null);
          setError(messageFromError(err));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const cancel = reload();
    return cancel;
  }, [reload]);

  return { data, error, loading, reload };
}

export function messageFromError(err: unknown): string {
  if (err instanceof ApiConnectionError) {
    return 'Cannot reach Tedor right now. Check your connection and try again.';
  }
  if (err instanceof ApiError) {
    if (err.status === 401) return 'Your session has expired. Please sign in again.';
    if (err.status === 403) return 'You do not have access to this. Please sign in with the right account.';
    if (err.status === 404) return 'We could not find what you asked for. It may have been removed.';
    if (err.status === 429) return 'Too many requests. Please wait a moment and try again.';
    if (err.status >= 500) return 'Tedor is having trouble right now. Please try again shortly.';
    return err.message || 'Something went wrong. Please try again.';
  }
  return err instanceof Error && err.message ? err.message : 'Something went wrong. Please try again.';
}