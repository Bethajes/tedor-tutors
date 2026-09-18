import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Spinner } from '@tedor/ui';
import { LoginForm } from '../../components/login-form';

export const metadata: Metadata = {
  title: 'Sign in | Tedor Tutors',
  description: 'Sign in to Tedor Tutors to connect with expert tutors and manage your learning.',
};

function LoginFallback() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <Spinner label="Loading sign-in…" />
      </div>
    </div>
  );
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm next={next} />
    </Suspense>
  );
}
