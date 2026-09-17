import { Suspense } from 'react';
import { AuthCard } from '@tedor/ui';
import { ResetPasswordForm } from '../../components/reset-password-form';

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) {
    return (
      <div style={{ paddingTop: '4rem' }}>
        <AuthCard title="Missing token" subtitle="Open the reset link from your email again." />
      </div>
    );
  }
  return (
    <div style={{ paddingTop: '4rem' }}>
      <Suspense fallback={<AuthCard title="Choose a new password" />}>
        <ResetPasswordForm token={token} />
      </Suspense>
    </div>
  );
}