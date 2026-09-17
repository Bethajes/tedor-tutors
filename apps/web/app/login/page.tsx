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
    <div style={{ paddingTop: '4rem' }}>
      <Suspense fallback={<AuthCard title="Sign in to Tedor Path" />}>
        <LoginForm next={next} />
      </Suspense>
    </div>
  );
}