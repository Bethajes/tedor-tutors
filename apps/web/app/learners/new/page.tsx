'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ClientArea } from '../../../components/client/client-area';
import { PageHeader } from '../../../components/client/client-ui';
import { LearnerForm } from '../../../components/client/learner-form';

export default function NewLearnerPage() {
  const router = useRouter();

  return (
    <ClientArea>
      <Link
        href="/learners"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 no-underline transition-colors hover:text-indigo-600"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to learners
      </Link>
      <PageHeader
        eyebrow="New learner"
        title="Add a learner"
        description="Tell us about the learner so we can find the right tutor."
      />
      <LearnerForm
        submitLabel="Create learner"
        onSaved={() => router.replace('/learners')}
        onCancel={() => router.replace('/learners')}
      />
    </ClientArea>
  );
}
