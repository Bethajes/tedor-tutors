import { Suspense } from 'react';
import { Spinner } from '@tedor/ui';
import { VerifyEmailScreen } from '../../components/verify-email-screen';

function VerifyFallback() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50">
      <Spinner label="Loading…" />
    </div>
  );
}

export default async function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyFallback />}>
      <VerifyEmailScreen />
    </Suspense>
  );
}