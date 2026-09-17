'use client';

import { useRouter } from 'next/navigation';
import { ClientArea } from '../../../components/client/client-area';
import { LearnerForm } from '../../../components/client/learner-form';

export default function NewLearnerPage() {
  const router = useRouter();

  return (
    <ClientArea>
      <h1>Add a learner</h1>
      <LearnerForm
        submitLabel="Create learner"
        onSaved={() => router.replace('/learners')}
        onCancel={() => router.replace('/learners')}
      />
    </ClientArea>
  );
}