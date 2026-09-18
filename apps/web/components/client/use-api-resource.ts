'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

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
    setLoading(true);
    setError(null);
    loaderRef
      .current()
      .then((result) => setData(result))
      .catch((err: Error) => {
        setData(null);
        setError(err.message || 'Something went wrong');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, error, loading, reload };
}

export function messageFromError(err: unknown): string {
  return err instanceof Error && err.message ? err.message : 'Something went wrong';
}