import { Suspense } from 'react';
import { AuthCard, Spinner } from '@tedor/ui';
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
        <AuthCard title="Missing token" subtitle="Open the reset link from your email again.">
          <p className="muted">
            The reset link is incomplete. Request a new password reset email and try again.
          </p>
        </AuthCard>
      </div>
    );
  }
  return (
    <div style={{ paddingTop: '4rem' }}>
      <Suspense
        fallback={
          <AuthCard title="Choose a new password">
            <Spinner label="Loading…" />
          </AuthCard>
        }
      >
        <ResetPasswordForm token={token} />
      </Suspense>
    </div>
  );
}