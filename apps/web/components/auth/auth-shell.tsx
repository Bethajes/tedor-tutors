import Link from 'next/link';
import type { ReactNode } from 'react';
import { BookOpenCheck, Globe, ShieldCheck, Sparkles } from 'lucide-react';
import { BrandLockup } from './brand';

/**
 * Marketing highlights shown on the left panel of the split-screen shell
 * (hidden below the `lg` breakpoint, where the shell collapses to a card).
 */
const HIGHLIGHTS = [
  {
    icon: BookOpenCheck,
    title: 'Personalised matching',
    body: 'We pair every learner with a tutor who fits their goals, schedule, and learning style.',
  },
  {
    icon: ShieldCheck,
    title: 'Vetted expert tutors',
    body: 'Background-checked professionals with proven track records across 40+ subjects.',
  },
  {
    icon: Sparkles,
    title: 'Progress you can see',
    body: 'Session notes, milestones, and learner insights in one clear dashboard.',
  },
] as const;

/**
 * Split-screen auth shell. Left: deep-indigo marketing panel. Right: the auth
 * card slot. Collapses to a centered card layout below `lg`.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-slate-50 lg:grid lg:grid-cols-2">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-950 lg:block">
        <div
          aria-hidden="true"
          className="absolute -top-32 -left-32 size-96 rounded-full bg-indigo-500/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute right-0 bottom-0 size-80 translate-x-1/3 translate-y-1/3 rounded-full bg-violet-500/15 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.05] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:44px_44px]"
        />

        <div className="relative flex h-full flex-col p-12">
          <Link href="/" className="w-fit no-underline">
            <div className="[&_span]:text-white">
              <BrandLockup size="md" />
            </div>
          </Link>

          <div className="flex flex-1 flex-col justify-center py-12">
            <h2 className="max-w-md text-3xl font-bold tracking-tight text-white xl:text-4xl">
              Every learner deserves an expert by their side.
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-indigo-100/80">
              Tedor Tutors connects ambitious learners with hand-picked tutors for one-on-one
              sessions that actually move the needle.
            </p>

            <ul className="mt-10 space-y-6">
              {HIGHLIGHTS.map(({ icon: Icon, title, body }) => (
                <li key={title} className="flex gap-4">
                  <span className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15 ring-inset">
                    <Icon className="size-5 text-indigo-200" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">{title}</p>
                    <p className="mt-1 max-w-sm text-sm leading-relaxed text-indigo-100/70">{body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-indigo-200/50">
            © {new Date().getFullYear()} Tedor Tutors. All rights reserved.
          </p>
        </div>
      </aside>

      {/* Form panel */}
      <main className="flex flex-1 flex-col">
        <header className="border-b border-slate-200 bg-white/80 p-4 backdrop-blur lg:hidden">
          <div className="mx-auto w-full max-w-md">
            <Link href="/" className="inline-flex no-underline">
              <BrandLockup size="sm" />
            </Link>
          </div>
        </header>

        <div className="flex flex-1 items-center justify-center p-4 sm:p-8">
          <div className="w-full max-w-md">{children}</div>
        </div>

        <footer className="flex items-center justify-center gap-4 border-t border-slate-200 px-4 py-4 text-xs text-slate-500">
          <span>© {new Date().getFullYear()} Tedor Tutors</span>
          <span aria-hidden="true" className="size-0.5 rounded-full bg-slate-300" />
          <Link href="/register" className="inline-flex items-center gap-1 no-underline transition-colors hover:text-indigo-600">
            <Globe className="size-3" aria-hidden="true" />
            Become a tutor
          </Link>
          <span aria-hidden="true" className="size-0.5 rounded-full bg-slate-300" />
          <span>Privacy</span>
          <span aria-hidden="true" className="size-0.5 rounded-full bg-slate-300" />
          <span>Terms</span>
        </footer>
      </main>
    </div>
  );
}
