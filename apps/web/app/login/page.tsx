import { Suspense } from 'react';
import { AuthCard } from '@tedor/ui';
import { LoginForm } from '../../components/login-form';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-16">
      <div className="mb-6 flex items-center gap-2.5" aria-hidden="true">
        <span className="flex size-10 items-center justify-center rounded-xl bg-blue-700 text-lg font-bold text-white">
          T
        </span>
        <span className="text-lg font-semibold tracking-tight text-slate-900">Tedor Path</span>
      </div>
      <Suspense fallback={<AuthCard title="Sign in to Tedor Path" />}>
        <LoginForm next={next} />
      </Suspense>
      <p className="mt-8 text-center text-xs text-slate-400">
        Secure sign-in for students, tutors, and staff.
      </p>
    </main>
  );
}
