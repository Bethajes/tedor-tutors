'use client';

import Link from 'next/link';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { AuthenticatedLayout } from '../../components/authenticated-layout';
import { ProtectedRoute } from '../../components/protected';
import { ClientNav } from '../../components/client/client-area';
import { ClientDashboard } from '../../components/client/dashboard';
import { TutorDashboard } from '../../components/tutor/tutor-dashboard';
import { useAuth } from '../../lib/auth-context';

const STAFF_ROLES = ['COORDINATOR', 'ADMIN', 'SUPER_ADMIN'] as const;

function StaffWorkspace() {
  const { user } = useAuth();
  const role = user?.role.toLowerCase() ?? 'staff';
  return (
    <div className="mx-auto w-full max-w-2xl py-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm shadow-slate-900/5">
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100 ring-inset">
          <ShieldCheck className="size-6" aria-hidden="true" />
        </span>
        <p className="mt-4 text-xs font-semibold tracking-widest text-indigo-600 uppercase">
          {role} workspace
        </p>
        <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900">
          Welcome, {user?.name}
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
          Manage users, tutor requests, and matches from the admin console.
        </p>
        <Link
          href="/admin"
          className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white no-underline shadow-sm shadow-indigo-600/30 transition-colors hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          Open admin console
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const isClient = user?.role === 'CLIENT';
  const isTutor = user?.role === 'TUTOR';
  const isStaff = !!user && (STAFF_ROLES as readonly string[]).includes(user.role);

  return (
    <ProtectedRoute>
      <AuthenticatedLayout>
        {isClient ? <ClientNav /> : null}
        {isClient ? (
          <ClientDashboard />
        ) : isTutor ? (
          <TutorDashboard />
        ) : isStaff ? (
          <StaffWorkspace />
        ) : (
          <div className="mx-auto w-full max-w-2xl py-10">
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Welcome, {user?.name}
              </h1>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
                Your workspace is being prepared. Check back soon.
              </p>
            </div>
          </div>
        )}
      </AuthenticatedLayout>
    </ProtectedRoute>
  );
}
