import { Suspense } from 'react';
import { AuthCard } from '@tedor/ui';
import { VerifyEmailScreen } from '../../components/verify-email-screen';

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <div style={{ paddingTop: '4rem' }}>
      <Suspense fallback={<AuthCard title="Verify your email" />}>
        <VerifyEmailScreen token={token} />
      </Suspense>
    </div>
  );
}