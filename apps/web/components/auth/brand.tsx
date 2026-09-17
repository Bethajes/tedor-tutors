import { GraduationCap } from 'lucide-react';

interface BrandMarkProps {
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Tedor Tutors logo placeholder — an indigo rounded square holding a
 * graduation-cap glyph. Swap the <GraduationCap /> for an <Image /> once
 * final brand artwork is available.
 */
export function BrandMark({ size = 'md' }: BrandMarkProps) {
  const box =
    size === 'lg' ? 'size-11 rounded-xl' : size === 'sm' ? 'size-8 rounded-lg' : 'size-10 rounded-xl';
  const icon = size === 'lg' ? 'size-6' : size === 'sm' ? 'size-4.5' : 'size-5';

  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm shadow-indigo-600/30 ${box}`}
    >
      <GraduationCap className={icon} strokeWidth={2.25} />
    </span>
  );
}

/** Wordmark + tagline lock-up used in the auth shells' headers. */
export function BrandLockup({ size = 'md' }: BrandMarkProps) {
  return (
    <div className="flex items-center gap-3">
      <BrandMark size={size} />
      <div className="flex flex-col">
        <span
          className={`font-semibold tracking-tight text-slate-900 ${size === 'sm' ? 'text-base' : 'text-lg'}`}
        >
          Tedor Tutors
        </span>
        <span className="text-xs text-slate-500">Connecting learners with expert tutors</span>
      </div>
    </div>
  );
}
