import type { Metadata } from 'next';
import { RegisterForm } from '../../components/register-form';

export const metadata: Metadata = {
  title: 'Create account | Tedor Tutors',
  description: 'Create a Tedor Tutors account to find expert tutors or offer your tutoring services.',
};

export default function RegisterPage() {
  return <RegisterForm />;
}
